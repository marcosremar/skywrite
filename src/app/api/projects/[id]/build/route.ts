import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { spawn } from "child_process";
import * as fs from "fs/promises";
import * as path from "path";

// Use Docker for builds (set to false to use local Python)
const USE_DOCKER = process.env.USE_DOCKER_BUILD !== "false";

// POST /api/projects/[id]/build - Start a new build
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    // Verify project ownership and get files
    const project = await db.project.findFirst({
      where: { id, userId: session.user.id },
      include: { files: true },
    });

    if (!project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    // Create build record
    const build = await db.build.create({
      data: {
        projectId: id,
        type: "FULL",
        status: "PROCESSING",
        startedAt: new Date(),
      },
    });

    try {
      // Prepare project data for Python script
      const projectData = {
        project_id: id,
        template_id: project.templateId || null,
        files: project.files.map((f) => ({
          path: f.path,
          content: f.content,
          type: f.type,
        })),
        metadata: {
          title: project.title || project.name,
          author: project.author,
          language: project.language || "portuguese",
        },
      };

      // Call Python build script
      const result = await runPythonBuild(projectData);

      if (result.success && result.pdfPath) {
        // Read the generated PDF
        const pdfBuffer = await fs.readFile(result.pdfPath);
        const pdfBase64 = pdfBuffer.toString("base64");
        const pdfDataUrl = `data:application/pdf;base64,${pdfBase64}`;

        // Update build record
        const completedBuild = await db.build.update({
          where: { id: build.id },
          data: {
            status: "COMPLETED",
            completedAt: new Date(),
            durationMs: Date.now() - build.queuedAt.getTime(),
            pdfUrl: pdfDataUrl,
            pdfSizeBytes: pdfBuffer.length,
            logs: result.logs || "PDF generated successfully with LaTeX",
          },
        });

        return NextResponse.json({
          build: completedBuild,
          pdfUrl: pdfDataUrl,
          message: "Build completed successfully",
        });
      } else {
        throw new Error(result.error || "Build failed");
      }
    } catch (buildError) {
      // Update build as failed
      await db.build.update({
        where: { id: build.id },
        data: {
          status: "FAILED",
          completedAt: new Date(),
          errorMessage:
            buildError instanceof Error ? buildError.message : "Unknown error",
        },
      });

      throw buildError;
    }
  } catch (error) {
    console.error("Error creating build:", error);
    return NextResponse.json(
      {
        error: "Build failed",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

interface BuildResult {
  success: boolean;
  pdfPath?: string;
  buildDir?: string;
  logs?: string;
  error?: string;
}

async function runPythonBuild(projectData: object): Promise<BuildResult> {
  if (USE_DOCKER) {
    return runDockerBuild(projectData);
  }
  return runLocalPythonBuild(projectData);
}

async function runDockerBuild(projectData: object): Promise<BuildResult> {
  return new Promise((resolve) => {
    const coreDir = path.join(process.cwd(), "core");
    const builderImage = "thesis-writer-builder:latest";

    // Create a host directory to receive the PDF output
    // We use a unique directory per project to avoid conflicts
    const projectId = (projectData as { project_id?: string }).project_id || "unknown";
    const hostBuildDir = path.join(process.cwd(), ".build-output", projectId);

    // Ensure the build output directory exists
    const mkdirSync = require("fs").mkdirSync;
    mkdirSync(hostBuildDir, { recursive: true });

    // Templates directory
    const templatesDir = path.join(process.cwd(), "templates");

    // Docker run command with volume mount for output
    const docker = spawn("docker", [
      "run",
      "--rm",
      "-i",
      "-v", `${coreDir}:/app/core:ro`,
      "-v", `${templatesDir}:/app/templates:ro`,
      "-v", `${hostBuildDir}:/tmp/thesis-build-${projectId}`,
      builderImage,
    ], {
      cwd: process.cwd(),
    });

    let stdout = "";
    let stderr = "";

    docker.stdout.on("data", (data) => {
      stdout += data.toString();
    });

    docker.stderr.on("data", (data) => {
      stderr += data.toString();
    });

    // Send project data via stdin
    docker.stdin.write(JSON.stringify(projectData));
    docker.stdin.end();

    docker.on("close", (code) => {
      // Try to parse result from stdout
      const resultMatch = stdout.match(/--- RESULT ---\s*([\s\S]*?)$/);
      if (resultMatch) {
        try {
          const result = JSON.parse(resultMatch[1].trim());
          // Map container path to host path - check for both main.pdf (template) and thesis.pdf (default)
          let hostPdfPath = path.join(hostBuildDir, "main.pdf");
          const fsSync = require("fs");
          if (!fsSync.existsSync(hostPdfPath)) {
            hostPdfPath = path.join(hostBuildDir, "thesis.pdf");
          }
          resolve({
            success: result.success,
            pdfPath: hostPdfPath,  // Use host path instead of container path
            buildDir: hostBuildDir,
            logs: stdout,
          });
          return;
        } catch {
          // Failed to parse result
        }
      }

      if (code === 0) {
        resolve({
          success: false,
          error: "Build completed but no PDF path found",
          logs: stdout + stderr,
        });
      } else {
        resolve({
          success: false,
          error: `Docker build failed with exit code ${code}`,
          logs: stdout + stderr,
        });
      }
    });

    docker.on("error", (err) => {
      resolve({
        success: false,
        error: `Failed to start Docker: ${err.message}. Make sure the builder image exists (docker build -f docker/Dockerfile.builder -t thesis-writer-builder:latest .)`,
      });
    });

    // Timeout after 10 minutes for Docker builds
    setTimeout(() => {
      docker.kill();
      resolve({
        success: false,
        error: "Docker build timed out after 10 minutes",
      });
    }, 10 * 60 * 1000);
  });
}

async function runLocalPythonBuild(projectData: object): Promise<BuildResult> {
  return new Promise((resolve) => {
    const scriptPath = path.join(
      process.cwd(),
      "core",
      "scripts",
      "build_project.py"
    );

    // Spawn Python process
    const python = spawn("python3", [scriptPath], {
      cwd: process.cwd(),
    });

    let stdout = "";
    let stderr = "";

    python.stdout.on("data", (data) => {
      stdout += data.toString();
    });

    python.stderr.on("data", (data) => {
      stderr += data.toString();
    });

    // Send project data via stdin
    python.stdin.write(JSON.stringify(projectData));
    python.stdin.end();

    python.on("close", (code) => {
      // Try to parse result from stdout
      const resultMatch = stdout.match(/--- RESULT ---\s*([\s\S]*?)$/);
      if (resultMatch) {
        try {
          const result = JSON.parse(resultMatch[1].trim());
          resolve({
            success: result.success,
            pdfPath: result.pdf_path,
            buildDir: result.build_dir,
            logs: stdout,
          });
          return;
        } catch {
          // Failed to parse result
        }
      }

      // If no parseable result, check exit code
      if (code === 0) {
        resolve({
          success: false,
          error: "Build completed but no PDF path found",
          logs: stdout + stderr,
        });
      } else {
        resolve({
          success: false,
          error: `Build failed with exit code ${code}`,
          logs: stdout + stderr,
        });
      }
    });

    python.on("error", (err) => {
      resolve({
        success: false,
        error: `Failed to start Python: ${err.message}`,
      });
    });

    // Timeout after 5 minutes
    setTimeout(() => {
      python.kill();
      resolve({
        success: false,
        error: "Build timed out after 5 minutes",
      });
    }, 5 * 60 * 1000);
  });
}

// GET /api/projects/[id]/build - Get latest builds
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    // Verify project ownership
    const project = await db.project.findFirst({
      where: { id, userId: session.user.id },
    });

    if (!project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    const builds = await db.build.findMany({
      where: { projectId: id },
      orderBy: { queuedAt: "desc" },
      take: 10,
    });

    return NextResponse.json({ builds });
  } catch (error) {
    console.error("Error fetching builds:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
