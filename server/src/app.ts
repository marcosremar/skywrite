import express from "express";
import helmet from "helmet";
import cookieParser from "cookie-parser";
import cors from "cors";
import path from "path";
import { existsSync } from "fs";
import { authRouter } from "./routes/auth.js";
import { projectsRouter } from "./routes/projects.js";
import { filesRouter } from "./routes/files.js";
import { analyzeRouter } from "./routes/analyze.js";
import { buildRouter } from "./routes/build.js";
import { researchRouter } from "./routes/research.js";
import { citationsRouter } from "./routes/citations.js";
import { reportRouter } from "./routes/report.js";
import { templatesRouter } from "./routes/templates.js";
import { writingRouter } from "./routes/writing.js";
import { grammarRouter } from "./routes/grammar.js";
import { sourcesRouter } from "./routes/sources.js";
import { originalityRouter } from "./routes/originality.js";
import { pingGateway } from "./lib/ai-gateway.js";
import { db } from "./db.js";

export function createApp() {
  const app = express();
  app.set("trust proxy", 1);
  app.use(helmet({ contentSecurityPolicy: false }));

  app.use(
    cors({
      origin: process.env.CLIENT_ORIGIN || "http://localhost:5175",
      credentials: true,
    })
  );
  app.use(express.json({ limit: "10mb" }));
  app.use(cookieParser());

  app.get("/api/health", async (_req, res) => {
    let database = "up";
    try {
      await db.$queryRaw`SELECT 1`;
    } catch {
      database = "down";
    }
    res.status(database === "up" ? 200 : 503).json({
      status: database === "up" ? "healthy" : "unhealthy",
      timestamp: new Date().toISOString(),
      database,
      gateway: (await pingGateway()) ? "up" : "down",
    });
  });

  app.use("/api/auth", authRouter);
  app.use("/api/templates", templatesRouter);
  app.use("/api/projects/:id/files", filesRouter);
  app.use("/api/projects/:id/analyze", analyzeRouter);
  app.use("/api/projects/:id/build", buildRouter);
  app.use("/api/projects/:id/research", researchRouter);
  app.use("/api/projects/:id/citations", citationsRouter);
  app.use("/api/projects/:id/report", reportRouter);
  app.use("/api/projects/:id/writing", writingRouter);
  app.use("/api/projects/:id/grammar", grammarRouter);
  app.use("/api/projects/:id/sources", sourcesRouter);
  app.use("/api/projects/:id/originality", originalityRouter);
  app.use("/api/projects", projectsRouter);

  const clientDist = process.env.CLIENT_DIST || path.resolve(process.cwd(), "../client/dist");
  if (existsSync(clientDist)) {
    app.use(express.static(clientDist));
    app.get("*", (req, res, next) => {
      if (req.path.startsWith("/api")) return next();
      res.sendFile(path.join(clientDist, "index.html"));
    });
  }

  app.use((err: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
    if (res.headersSent) return;
    if (err instanceof SyntaxError && "body" in err) {
      return res.status(400).json({ error: "JSON invalido" });
    }
    if (typeof err === "object" && err !== null && (err as { type?: string }).type === "entity.too.large") {
      return res.status(413).json({ error: "Payload muito grande" });
    }
    console.error("Unhandled error:", err);
    res.status(500).json({ error: "Internal server error" });
  });

  return app;
}
