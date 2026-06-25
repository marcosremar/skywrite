import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import type { Server } from "http";
import { createApp } from "../src/app.js";
import { db } from "../src/db.js";
import { pruneBuilds } from "../src/routes/build.js";
import { prunePaperCache } from "../src/lib/paper-ingest.js";

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

  test("patch project metadata", async () => {
    const res = await api("PATCH", `/api/projects/${projectId}`, {
      cookie,
      body: { author: "Marcos", title: "Título Novo" },
    });
    expect(res.status).toBe(200);
    expect(res.json.project.author).toBe("Marcos");
    expect(res.json.project.title).toBe("Título Novo");
  });

  test("patch unknown project is 404", async () => {
    const res = await api("PATCH", "/api/projects/nao-existe-xyz", {
      cookie,
      body: { title: "x" },
    });
    expect(res.status).toBe(404);
  });

  test("delete project cascades and then 404s", async () => {
    const created = await api("POST", "/api/projects", {
      cookie,
      body: { name: "Para Excluir", language: "pt-BR" },
    });
    const id = created.json.project.id;
    const del = await api("DELETE", `/api/projects/${id}`, { cookie });
    expect(del.status).toBe(200);
    const get = await api("GET", `/api/projects/${id}`, { cookie });
    expect(get.status).toBe(404);
    const delAgain = await api("DELETE", `/api/projects/${id}`, { cookie });
    expect(delAgain.status).toBe(404);
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

describe("health database field", () => {
  test("reports database up", async () => {
    const res = await api("GET", "/api/health");
    expect(res.json.database).toBe("up");
    expect(res.json).toHaveProperty("gateway");
  });
});

describe("auth validation", () => {
  test("rejects invalid email format", async () => {
    const res = await api("POST", "/api/auth/register", {
      body: { name: "X", email: "notanemail", password: "password123" },
    });
    expect(res.status).toBe(400);
  });

  test("rejects duplicate email", async () => {
    const email = `dup-${Date.now()}@skywrite.test`;
    createdUserEmails.push(email);
    const first = await api("POST", "/api/auth/register", {
      body: { name: "X", email, password: "password123" },
    });
    expect(first.status).toBe(200);
    const second = await api("POST", "/api/auth/register", {
      body: { name: "Y", email, password: "password123" },
    });
    expect(second.status).toBe(409);
  });

  test("login without body is 400", async () => {
    const res = await api("POST", "/api/auth/login", { body: {} });
    expect(res.status).toBe(400);
  });
});

describe("ownership isolation (IDOR)", () => {
  let cookieA = "";
  let cookieB = "";
  let projectA = "";

  beforeAll(async () => {
    const ea = `owner-a-${Date.now()}@skywrite.test`;
    const eb = `owner-b-${Date.now()}@skywrite.test`;
    createdUserEmails.push(ea, eb);
    cookieA = (
      await api("POST", "/api/auth/register", { body: { name: "A", email: ea, password: "password123" } })
    ).cookie;
    cookieB = (
      await api("POST", "/api/auth/register", { body: { name: "B", email: eb, password: "password123" } })
    ).cookie;
    const created = await api("POST", "/api/projects", {
      cookie: cookieA,
      body: { name: "A Project", language: "pt-BR" },
    });
    projectA = created.json.project.id;
    createdProjectIds.push(projectA);
  });

  test("owner reads own project", async () => {
    expect((await api("GET", `/api/projects/${projectA}`, { cookie: cookieA })).status).toBe(200);
  });
  test("other user cannot read project", async () => {
    expect((await api("GET", `/api/projects/${projectA}`, { cookie: cookieB })).status).toBe(404);
  });
  test("other user cannot patch project", async () => {
    const res = await api("PATCH", `/api/projects/${projectA}`, { cookie: cookieB, body: { title: "hack" } });
    expect(res.status).toBe(404);
  });
  test("other user cannot delete project", async () => {
    expect((await api("DELETE", `/api/projects/${projectA}`, { cookie: cookieB })).status).toBe(404);
  });
  test("other user cannot access files", async () => {
    const res = await api("GET", `/api/projects/${projectA}/files/metadata.yaml`, { cookie: cookieB });
    expect(res.status).toBe(404);
  });
  test("other user cannot create file", async () => {
    const res = await api("POST", `/api/projects/${projectA}/files`, {
      cookie: cookieB,
      body: { path: "x.md", content: "x", type: "MARKDOWN" },
    });
    expect(res.status).toBe(404);
  });
  test("other user cannot analyze project", async () => {
    expect((await api("POST", `/api/projects/${projectA}/analyze`, { cookie: cookieB })).status).toBe(404);
  });
});

describe("file edge cases", () => {
  let cookie = "";
  let projectId = "";

  beforeAll(async () => {
    cookie = await loginDemo();
    const created = await api("POST", "/api/projects", {
      cookie,
      body: { name: "Files Edge", language: "pt-BR" },
    });
    projectId = created.json.project.id;
    createdProjectIds.push(projectId);
  });

  test("read nonexistent file is 404", async () => {
    const res = await api("GET", `/api/projects/${projectId}/files/nope/missing.md`, { cookie });
    expect(res.status).toBe(404);
  });
  test("update nonexistent file is 404", async () => {
    const res = await api("PUT", `/api/projects/${projectId}/files/nope/missing.md`, {
      cookie,
      body: { content: "x" },
    });
    expect(res.status).toBe(404);
  });
  test("duplicate path create is rejected", async () => {
    const body = { path: "dup/file.md", content: "a", type: "MARKDOWN" };
    expect((await api("POST", `/api/projects/${projectId}/files`, { cookie, body })).status).toBe(200);
    const second = await api("POST", `/api/projects/${projectId}/files`, { cookie, body });
    expect([400, 409]).toContain(second.status);
  });
  test("rename to traversal path is rejected", async () => {
    await api("POST", `/api/projects/${projectId}/files`, {
      cookie,
      body: { path: "ren/a.md", content: "a", type: "MARKDOWN" },
    });
    const res = await api("POST", `/api/projects/${projectId}/files/rename`, {
      cookie,
      body: { oldPath: "ren/a.md", newPath: "../../escape.md" },
    });
    expect(res.status).toBe(400);
  });
});

describe("project & build edge cases", () => {
  let cookie = "";

  beforeAll(async () => {
    cookie = await loginDemo();
  });

  test("create project without name is rejected", async () => {
    const res = await api("POST", "/api/projects", { cookie, body: { language: "pt-BR" } });
    expect(res.status).toBe(400);
  });
  test("get nonexistent project is 404", async () => {
    expect((await api("GET", "/api/projects/inexistente-xyz", { cookie })).status).toBe(404);
  });
  test("list builds for nonexistent project is 404", async () => {
    expect((await api("GET", "/api/projects/inexistente-xyz/build", { cookie })).status).toBe(404);
  });
  test("get nonexistent pdf is 404", async () => {
    const list = await api("GET", "/api/projects", { cookie });
    const projectId = list.json.projects[0].id;
    const res = await api("GET", `/api/projects/${projectId}/build/nao-existe/pdf`, { cookie });
    expect(res.status).toBe(404);
  });
});

describe("pruneBuilds", () => {
  test("keeps only the newest N builds", async () => {
    const cookie = await loginDemo();
    const created = await api("POST", "/api/projects", {
      cookie,
      body: { name: "Prune Test", language: "pt-BR" },
    });
    const projectId = created.json.project.id;
    createdProjectIds.push(projectId);

    const base = Date.now();
    for (let i = 0; i < 12; i++) {
      await db.build.create({
        data: {
          projectId,
          status: "COMPLETED",
          pdfUrl: "data:application/pdf;base64,AAAA",
          queuedAt: new Date(base + i * 1000),
        },
      });
    }
    await pruneBuilds(projectId, 10);
    expect(await db.build.count({ where: { projectId } })).toBe(10);
  });

  test("is a no-op under the limit", async () => {
    const cookie = await loginDemo();
    const created = await api("POST", "/api/projects", {
      cookie,
      body: { name: "Prune Small", language: "pt-BR" },
    });
    const projectId = created.json.project.id;
    createdProjectIds.push(projectId);
    await db.build.create({ data: { projectId, status: "COMPLETED", pdfUrl: "data:," } });
    await pruneBuilds(projectId, 10);
    expect(await db.build.count({ where: { projectId } })).toBe(1);
  });
});

describe("academic features", () => {
  let cookie = "";
  let projectId = "";

  beforeAll(async () => {
    cookie = await loginDemo();
    const created = await api("POST", "/api/projects", {
      cookie,
      body: { name: "Academic Features", language: "pt-BR" },
    });
    projectId = created.json.project.id;
    createdProjectIds.push(projectId);
    await api("POST", `/api/projects/${projectId}/files`, {
      cookie,
      body: { path: "refs.bib", content: "@article{orphan2020,\ntitle = {T},\n}", type: "BIBTEX" },
    });
    await api("POST", `/api/projects/${projectId}/files`, {
      cookie,
      body: { path: "chapters/01.md", content: "Texto com [@inexistente2019].", type: "MARKDOWN" },
    });
  });

  test("citation integrity returns orphans, unused and incomplete", async () => {
    const res = await api("POST", `/api/projects/${projectId}/citations/integrity`, { cookie });
    expect(res.status).toBe(200);
    expect(res.json.orphans).toContain("inexistente2019");
    expect(res.json.unused).toContain("orphan2020");
    expect(res.json.incomplete.some((e: any) => e.key === "orphan2020")).toBe(true);
  });

  test("citation integrity is owner-scoped", async () => {
    const other = `feat-${Date.now()}@skywrite.test`;
    createdUserEmails.push(other);
    const reg = await api("POST", "/api/auth/register", { body: { name: "O", email: other, password: "password123" } });
    const res = await api("POST", `/api/projects/${projectId}/citations/integrity`, { cookie: reg.cookie });
    expect(res.status).toBe(404);
  });

  test("DOI lookup rejects empty doi", async () => {
    const res = await api("POST", `/api/projects/${projectId}/citations/doi`, { cookie, body: { doi: "" } });
    expect(res.status).toBe(400);
  });

  test("grammar returns empty matches for empty text", async () => {
    const res = await api("POST", `/api/projects/${projectId}/grammar`, { cookie, body: { text: "" } });
    expect(res.status).toBe(200);
    expect(res.json.matches).toEqual([]);
  });

  test("grammar handles text or degrades to 502", async () => {
    const res = await api("POST", `/api/projects/${projectId}/grammar`, {
      cookie,
      body: { text: "Os menino foi na escola." },
    });
    expect([200, 502]).toContain(res.status);
    if (res.status === 200) expect(Array.isArray(res.json.matches)).toBe(true);
  }, 30_000);

  test("paraphrase rejects empty text", async () => {
    const res = await api("POST", `/api/projects/${projectId}/writing/paraphrase`, { cookie, body: { text: "" } });
    expect(res.status).toBe(400);
  });

  test("title suggestion returns 200 or handled 502", async () => {
    const res = await api("POST", `/api/projects/${projectId}/writing/titles`, { cookie });
    expect([200, 502]).toContain(res.status);
    if (res.status === 200) expect(Array.isArray(res.json.titles)).toBe(true);
  }, 90_000);

  test("submission readiness returns checks", async () => {
    const res = await api("POST", `/api/projects/${projectId}/citations/submission`, { cookie });
    expect(res.status).toBe(200);
    expect(Array.isArray(res.json.checks)).toBe(true);
    expect(res.json.checks.some((c: any) => c.id === "abstract")).toBe(true);
  });

  test("originality reports unconfigured provider", async () => {
    const res = await api("POST", `/api/projects/${projectId}/originality`, { cookie });
    expect(res.status).toBe(200);
    expect(res.json.configured).toBe(false);
  });

  test("RIS import returns bibtex", async () => {
    const res = await api("POST", `/api/projects/${projectId}/citations/ris`, {
      cookie,
      body: { ris: "TY  - JOUR\nAU  - Silva, A\nTI  - Estudo\nPY  - 2021\nER  -" },
    });
    expect(res.status).toBe(200);
    expect(res.json.bibtex).toContain("@article");
  });

  test("RIS import rejects empty", async () => {
    const res = await api("POST", `/api/projects/${projectId}/citations/ris`, { cookie, body: { ris: "" } });
    expect(res.status).toBe(400);
  });

  test("cite from source returns bibtex (resolved or @online)", async () => {
    const res = await api("POST", `/api/projects/${projectId}/citations/from-source`, {
      cookie,
      body: { title: "Uma Fonte Qualquer Para Teste", url: "http://exemplo/x" },
    });
    expect(res.status).toBe(200);
    expect(typeof res.json.bibtex).toBe("string");
    expect(res.json.bibtex).toContain("@");
    expect(typeof res.json.resolved).toBe("boolean");
  }, 30_000);

  test("cite from source rejects empty payload", async () => {
    const res = await api("POST", `/api/projects/${projectId}/citations/from-source`, { cookie, body: {} });
    expect(res.status).toBe(400);
  });
});

describe("LGPD data export", () => {
  test("exports user data without password hash", async () => {
    const cookie = await loginDemo();
    const res = await api("GET", "/api/auth/me/export", { cookie });
    expect(res.status).toBe(200);
    expect(res.json.email).toBeDefined();
    expect(Array.isArray(res.json.projects)).toBe(true);
    expect(res.json.passwordHash).toBeUndefined();
  });

  test("export requires auth", async () => {
    const res = await api("GET", "/api/auth/me/export");
    expect(res.status).toBe(401);
  });
});

describe("paper cache TTL", () => {
  test("prunes papers older than the cutoff and keeps recent ones", async () => {
    const oldUrl = `http://cache-old-${Date.now()}`;
    const newUrl = `http://cache-new-${Date.now()}`;
    await db.paper.create({
      data: {
        url: oldUrl,
        content: "x".repeat(300),
        charCount: 300,
        source: "html",
        fetchedAt: new Date(Date.now() - 40 * 24 * 60 * 60 * 1000),
      },
    });
    await db.paper.create({ data: { url: newUrl, content: "y", charCount: 1, source: "html" } });
    await prunePaperCache(30);
    expect(await db.paper.findUnique({ where: { url: oldUrl } })).toBeNull();
    expect(await db.paper.findUnique({ where: { url: newUrl } })).not.toBeNull();
    await db.paper.delete({ where: { url: newUrl } }).catch(() => {});
  });
});
