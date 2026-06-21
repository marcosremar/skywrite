import { Router } from "express";
import bcrypt from "bcryptjs";
import { db } from "../db.js";
import { clearAuthCookie, requireAuth, setAuthCookie, signToken } from "../auth.js";

export const authRouter = Router();

authRouter.post("/register", async (req, res) => {
  try {
    const { name, email, password } = req.body ?? {};

    if (!email || !password) {
      return res.status(400).json({ error: "Email e senha sao obrigatorios" });
    }
    if (password.length < 8) {
      return res.status(400).json({ error: "Senha deve ter no minimo 8 caracteres" });
    }

    const existingUser = await db.user.findUnique({ where: { email } });
    if (existingUser) {
      return res.status(400).json({ error: "Email ja cadastrado" });
    }

    const passwordHash = await bcrypt.hash(password, 12);
    const user = await db.user.create({ data: { name, email, passwordHash } });

    const token = signToken(user.id);
    setAuthCookie(res, token);

    return res.json({ user: { id: user.id, name: user.name, email: user.email } });
  } catch (error) {
    console.error("Registration error:", error);
    return res.status(500).json({ error: "Erro ao criar conta" });
  }
});

authRouter.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body ?? {};
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
