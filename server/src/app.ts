import express from "express";
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
import { pingGateway } from "./lib/ai-gateway.js";

export function createApp() {
  const app = express();

  app.use(
    cors({
      origin: process.env.CLIENT_ORIGIN || "http://localhost:5175",
      credentials: true,
    })
  );
  app.use(express.json({ limit: "10mb" }));
  app.use(cookieParser());

  app.get("/api/health", async (_req, res) => {
    res.json({
      status: "healthy",
      timestamp: new Date().toISOString(),
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
  app.use("/api/projects", projectsRouter);

  const clientDist = process.env.CLIENT_DIST || path.resolve(process.cwd(), "../client/dist");
  if (existsSync(clientDist)) {
    app.use(express.static(clientDist));
    app.get("*", (req, res, next) => {
      if (req.path.startsWith("/api")) return next();
      res.sendFile(path.join(clientDist, "index.html"));
    });
  }

  return app;
}
