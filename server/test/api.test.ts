import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import type { Server } from "http";
import { createApp } from "../src/app.js";
import { db } from "../src/db.js";

let base = "";
let server: Server;
const createdProjectIds: string[] = [];
const createdUserEmails: string[] = [];

function tokenFromSetCookie(res: Response): string {
  const raw = res.headers.get("set-cookie") || "";
  return raw.split(";")[0];
}

async function api(
  method: string,
  path: string,
  opts: { cookie?: string; body?: unknown } = {}
) {
  const res = await fetch(`${base}${path}`, {
    method,
    headers: {
      "Content-Type": "application/json",
      ...(opts.cookie ? { Cookie: opts.cookie } : {}),
    },
    body: opts.body ? JSON.stringify(opts.body) : undefined,
  });
  const text = await res.text();
  let json: any = null;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    json = text;
  }
  return { status: res.status, json, cookie: tokenFromSetCookie(res) };
}

async function loginDemo() {
  const res = await api("POST", "/api/auth/login", {
    body: { email: "demo@thesis.writer", password: "demo123" },
  });
  return res.cookie;
}

beforeAll(async () => {
  server = createApp().listen(0);
  const addr = server.address();
  const port = typeof addr === "object" && addr ? addr.port : 4000;
  base = `http://127.0.0.1:${port}`;
});

afterAll(async () => {
  for (const id of createdProjectIds) {
    await db.project.delete({ where: { id } }).catch(() => {});
  }
  for (const email of createdUserEmails) {
    await db.user.delete({ where: { email } }).catch(() => {});
  }
  server.close();
});

describe("health", () => {
  test("GET /api/health", async () => {
    const res = await api("GET", "/api/health");
    expect(res.status).toBe(200);
    expect(res.json.status).toBe("healthy");
  });
});

describe("auth", () => {
  const email = `test-${Date.now()}@skywrite.test`;
  createdUserEmails.push(email);

  test("register returns user and sets cookie", async () => {
    const res = await api("POST", "/api/auth/register", {
      body: { name: "Test", email, password: "password123" },
    });
    expect(res.status).toBe(200);
    expect(res.json.user.email).toBe(email);
    expect(res.cookie).toContain("token=");
  });

  test("register rejects short password", async () => {
    const res = await api("POST", "/api/auth/register", {
      body: { email: `x-${Date.now()}@skywrite.test`, password: "short" },
    });
    expect(res.status).toBe(400);
  });

  test("login wrong password is 401", async () => {
    const res = await api("POST", "/api/auth/login", {
      body: { email, password: "wrongpass" },
    });
    expect(res.status).toBe(401);
  });

  test("login + me + logout", async () => {
    const login = await api("POST", "/api/auth/login", {
      body: { email, password: "password123" },
    });
    expect(login.status).toBe(200);

    const me = await api("GET", "/api/auth/me", { cookie: login.cookie });
    expect(me.status).toBe(200);
    expect(me.json.user.email).toBe(email);

    const logout = await api("POST", "/api/auth/logout", { cookie: login.cookie });
    expect(logout.status).toBe(200);
  });

  test("me without cookie is 401", async () => {
    const res = await api("GET", "/api/auth/me");
    expect(res.status).toBe(401);
  });

  test("register rejects missing name", async () => {
    const res = await api("POST", "/api/auth/register", {
      body: { email: `noname-${Date.now()}@skywrite.test`, password: "password123" },
    });
    expect(res.status).toBe(400);
  });

  test("account deletion removes the user", async () => {
    const delEmail = `del-${Date.now()}@skywrite.test`;
    const reg = await api("POST", "/api/auth/register", {
      body: { name: "Del", email: delEmail, password: "password123" },
    });
    const del = await api("DELETE", "/api/auth/me", { cookie: reg.cookie });
    expect(del.status).toBe(200);
    const relogin = await api("POST", "/api/auth/login", {
      body: { email: delEmail, password: "password123" },
    });
    expect(relogin.status).toBe(401);
  });
});

describe("projects and files", () => {
  let cookie = "";
  let projectId = "";

  beforeAll(async () => {
    cookie = await loginDemo();
  });

  test("unauthorized project list is 401", async () => {
    const res = await api("GET", "/api/projects");
    expect(res.status).toBe(401);
  });

  test("create project", async () => {
    const res = await api("POST", "/api/projects", {
      cookie,
      body: { name: "Test Project", title: "T", language: "pt-BR" },
    });
    expect(res.status).toBe(200);
    expect(res.json.project.id).toBeDefined();
    projectId = res.json.project.id;
    createdProjectIds.push(projectId);
  });

  test("get project includes files", async () => {
    const res = await api("GET", `/api/projects/${projectId}`, { cookie });
    expect(res.status).toBe(200);
    expect(Array.isArray(res.json.project.files)).toBe(true);
    expect(res.json.project.files.length).toBeGreaterThan(0);
  });

  test("list projects includes created", async () => {
    const res = await api("GET", "/api/projects", { cookie });
    expect(res.status).toBe(200);
    expect(res.json.projects.some((p: any) => p.id === projectId)).toBe(true);
  });

  test("file create, read, update, rename, delete", async () => {
    const create = await api("POST", `/api/projects/${projectId}/files`, {
      cookie,
      body: { path: "notes/draft.md", content: "rascunho", type: "MARKDOWN" },
    });
    expect(create.status).toBe(200);

    const read = await api("GET", `/api/projects/${projectId}/files/notes/draft.md`, { cookie });
    expect(read.status).toBe(200);
    expect(read.json.content).toBe("rascunho");

    const update = await api("PUT", `/api/projects/${projectId}/files/notes/draft.md`, {
      cookie,
      body: { content: "novo" },
    });
    expect(update.status).toBe(200);
    expect(update.json.content).toBe("novo");

    const rename = await api("POST", `/api/projects/${projectId}/files/rename`, {
      cookie,
      body: { oldPath: "notes/draft.md", newPath: "notes/final.md" },
    });
    expect(rename.status).toBe(200);
    expect(rename.json.file.path).toBe("notes/final.md");

    const del = await api("DELETE", `/api/projects/${projectId}/files/notes/final.md`, { cookie });
    expect(del.status).toBe(200);
  });

  test("rejects path traversal on file create", async () => {
    const res = await api("POST", `/api/projects/${projectId}/files`, {
      cookie,
      body: { path: "../../etc/passwd", content: "x", type: "OTHER" },
    });
    expect(res.status).toBe(400);
  });

  test("analyze returns structured analysis", async () => {
    const res = await api("POST", `/api/projects/${projectId}/analyze`, { cookie });
    expect(res.status).toBe(200);
    expect(res.json.analysis).toBeDefined();
    expect(Array.isArray(res.json.analysis.sections)).toBe(true);
  });
});

describe("templates", () => {
  test("list templates", async () => {
    const res = await api("GET", "/api/templates");
    expect(res.status).toBe(200);
    expect(Array.isArray(res.json.templates)).toBe(true);
  });

  test("get a template by id", async () => {
    const list = await api("GET", "/api/templates");
    const id = list.json.templates[0]?.id;
    if (!id) return;
    const res = await api("GET", `/api/templates/${id}`);
    expect(res.status).toBe(200);
    expect(res.json.template.id).toBe(id);
  });
});

describe("research (gateway-dependent)", () => {
  test("returns grounded answer or handled 502", async () => {
    const cookie = await loginDemo();
    const list = await api("GET", "/api/projects", { cookie });
    const projectId = list.json.projects[0].id;
    const res = await api("POST", `/api/projects/${projectId}/research`, {
      cookie,
      body: { question: "Existe suporte para IA no ensino de linguas?", content: "# Intro\ntexto", fileName: "01.md" },
    });
    expect([200, 502]).toContain(res.status);
    if (res.status === 200) {
      expect(typeof res.json.answer).toBe("string");
      expect(Array.isArray(res.json.sources)).toBe(true);
    } else {
      expect(res.json.error).toBeDefined();
    }
  }, 180_000);
});

describe("orientador features", () => {
  let cookie = "";
  let projectId = "";

  beforeAll(async () => {
    cookie = await loginDemo();
    const created = await api("POST", "/api/projects", {
      cookie,
      body: { name: "Features Test", language: "pt-BR" },
    });
    projectId = created.json.project.id;
    createdProjectIds.push(projectId);
  });

  test("citation check returns results array", async () => {
    const res = await api("POST", `/api/projects/${projectId}/citations/check`, { cookie });
    expect(res.status).toBe(200);
    expect(Array.isArray(res.json.results)).toBe(true);
  }, 60_000);

  test("suggest sources returns 200 or handled 502", async () => {
    const res = await api("POST", `/api/projects/${projectId}/research/sources`, {
      cookie,
      body: { claim: "Gamificação aumenta a motivação no ensino" },
    });
    expect([200, 502]).toContain(res.status);
  }, 90_000);

  test("feedback report PDF when pandoc present", async () => {
    if (!Bun.which("pandoc") || !Bun.which("tectonic")) return;
    const res = await api("POST", `/api/projects/${projectId}/report`, { cookie });
    expect(res.status).toBe(200);
  }, 180_000);
});

describe("build (pandoc-dependent)", () => {
  test("list builds is 200", async () => {
    const cookie = await loginDemo();
    const list = await api("GET", "/api/projects", { cookie });
    const projectId = list.json.projects[0].id;
    const res = await api("GET", `/api/projects/${projectId}/build`, { cookie });
    expect(res.status).toBe(200);
    expect(Array.isArray(res.json.builds)).toBe(true);
  });

  test("generates a PDF when pandoc and tectonic are present", async () => {
    const hasTools = Bun.which("pandoc") && Bun.which("tectonic");
    if (!hasTools) {
      console.log("skip: pandoc/tectonic ausentes");
      return;
    }
    const cookie = await loginDemo();
    const created = await api("POST", "/api/projects", {
      cookie,
      body: { name: "Build Test", language: "pt-BR" },
    });
    const projectId = created.json.project.id;
    createdProjectIds.push(projectId);

    const res = await api("POST", `/api/projects/${projectId}/build`, { cookie });
    expect(res.status).toBe(200);
    expect(res.json.pdfPath).toContain("/pdf");

    const pdf = await api("GET", res.json.pdfPath, { cookie });
    expect(pdf.status).toBe(200);
  }, 180_000);
});
