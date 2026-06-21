import express from "express";
import cookieParser from "cookie-parser";
import cors from "cors";
import { authRouter } from "./routes/auth.js";
import { projectsRouter } from "./routes/projects.js";
import { filesRouter } from "./routes/files.js";
import { analyzeRouter } from "./routes/analyze.js";
import { buildRouter } from "./routes/build.js";
import { researchRouter } from "./routes/research.js";
import { templatesRouter } from "./routes/templates.js";

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

  app.get("/api/health", (_req, res) => {
    res.json({ status: "healthy", timestamp: new Date().toISOString() });
  });

  app.use("/api/auth", authRouter);
  app.use("/api/templates", templatesRouter);
  app.use("/api/projects/:id/files", filesRouter);
  app.use("/api/projects/:id/analyze", analyzeRouter);
  app.use("/api/projects/:id/build", buildRouter);
  app.use("/api/projects/:id/research", researchRouter);
  app.use("/api/projects", projectsRouter);

  return app;
}
