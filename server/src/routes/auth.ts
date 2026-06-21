import { Router } from "express";
import bcrypt from "bcryptjs";
import { db } from "../db.js";
import { clearAuthCookie, requireAuth, setAuthCookie, signToken } from "../auth.js";
import { authLimiter } from "../lib/rate-limit.js";

export const authRouter = Router();

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function normalizeEmail(value: unknown): string {
  return typeof value === "string" ? value.trim().toLowerCase() : "";
}

authRouter.post("/register", authLimiter, async (req, res) => {
  try {
    const { name, password } = req.body ?? {};
    const email = normalizeEmail(req.body?.email);

    if (!email || !password) {
      return res.status(400).json({ error: "Email e senha sao obrigatorios" });
    }
    if (!EMAIL_RE.test(email)) {
      return res.status(400).json({ error: "Email invalido" });
    }
    if (typeof name !== "string" || name.trim().length === 0) {
      return res.status(400).json({ error: "Nome e obrigatorio" });
    }
    if (typeof password !== "string" || password.length < 8) {
      return res.status(400).json({ error: "Senha deve ter no minimo 8 caracteres" });
    }

    const existingUser = await db.user.findUnique({ where: { email } });
    if (existingUser) {
      return res.status(409).json({ error: "Email ja cadastrado" });
    }

    const passwordHash = await bcrypt.hash(password, 12);
    const user = await db.user.create({ data: { name: name.trim(), email, passwordHash } });

    const token = signToken(user.id);
    setAuthCookie(res, token);

    return res.json({ user: { id: user.id, name: user.name, email: user.email } });
  } catch (error) {
    console.error("Registration error:", error);
    return res.status(500).json({ error: "Erro ao criar conta" });
  }
});

authRouter.post("/login", authLimiter, async (req, res) => {
  try {
    const { password } = req.body ?? {};
    const email = normalizeEmail(req.body?.email);
    if (!email || !password) {
      return res.status(400).json({ error: "Email e senha sao obrigatorios" });
    }

    const user = await db.user.findUnique({ where: { email } });
    if (!user || !user.passwordHash) {
      return res.status(401).json({ error: "Email ou senha incorretos" });
    }

    const isValid = await bcrypt.compare(password, user.passwordHash);
    if (!isValid) {
      return res.status(401).json({ error: "Email ou senha incorretos" });
    }

    const token = signToken(user.id);
    setAuthCookie(res, token);

    return res.json({
      user: { id: user.id, name: user.name, email: user.email, image: user.image },
    });
  } catch (error) {
    console.error("Login error:", error);
    return res.status(500).json({ error: "Erro ao fazer login" });
  }
});

authRouter.post("/logout", (_req, res) => {
  clearAuthCookie(res);
  return res.json({ success: true });
});

authRouter.get("/me", requireAuth, async (req, res) => {
  const user = await db.user.findUnique({
    where: { id: req.userId },
    select: { id: true, name: true, email: true, image: true },
  });
  if (!user) {
    return res.status(401).json({ error: "Unauthorized" });
  }
  return res.json({ user });
});

authRouter.delete("/me", requireAuth, async (req, res) => {
  try {
    await db.user.delete({ where: { id: req.userId } });
    clearAuthCookie(res);
    return res.json({ success: true });
  } catch (error) {
    console.error("Account deletion error:", error);
    return res.status(500).json({ error: "Erro ao excluir conta" });
  }
});
