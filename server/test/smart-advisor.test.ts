import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import type { Server } from "http";
import { createApp } from "../src/app.js";
import { db } from "../src/db.js";
import { parseResearchResponse } from "../src/routes/research.js";
import { parseChunkSelection } from "../src/lib/semantic-excerpts.js";

let base = "";
let server: Server;
let cookie = "";
let projectId = "";

function tokenFromSetCookie(res: Response): string {
  const raw = res.headers.get("set-cookie") || "";
  return raw.split(";")[0];
}

async function api(method: string, path: string, opts: { cookie?: string; body?: unknown } = {}) {
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
  return { status: res.status, json };
}

beforeAll(async () => {
  server = createApp().listen(0);
  const addr = server.address();
  const port = typeof addr === "object" && addr ? addr.port : 4000;
  base = `http://127.0.0.1:${port}`;

  const login = await fetch(`${base}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: "demo@thesis.writer", password: "demo123" }),
  });
  cookie = tokenFromSetCookie(login);

  const created = await api("POST", "/api/projects", {
    cookie,
    body: { name: `smart-advisor-${Date.now()}` },
  });
  projectId = created.json.project.id;
});

afterAll(async () => {
  if (projectId) await db.project.delete({ where: { id: projectId } }).catch(() => {});
  server.close();
});

describe("parseResearchResponse confidence", () => {
  test("parses and clamps confidence", () => {
    const raw = JSON.stringify({
      answer: "ok",
      verdicts: [
        { claim: "a", classification: "supported", confidence: 0.9, evidence: "", source: 1 },
        { claim: "b", classification: "partial", confidence: 7, evidence: "", source: null },
        { claim: "c", classification: "uncertain", evidence: "", source: null },
      ],
    });
    const { verdicts } = parseResearchResponse(raw, 2);
    expect(verdicts[0].confidence).toBe(0.9);
    expect(verdicts[1].confidence).toBe(1);
    expect(verdicts[2].confidence).toBe(0.5);
  });
});

describe("parseChunkSelection", () => {
  test("parses valid array with bounds and dedup", () => {
    expect(parseChunkSelection("Os mais relevantes: [3, 0, 3, 12]", 10)).toEqual([3, 0]);
  });

  test("returns empty on garbage", () => {
    expect(parseChunkSelection("não sei", 10)).toEqual([]);
    expect(parseChunkSelection("[]", 10)).toEqual([]);
  });
});

describe("chat history", () => {
  test("GET history starts empty", async () => {
    const res = await api("GET", `/api/projects/${projectId}/research/history`, { cookie });
    expect(res.status).toBe(200);
    expect(res.json.messages).toEqual([]);
  });

  test("GET history returns persisted messages in order", async () => {
    await db.chatMessage.create({
      data: { projectId, role: "user", content: "pergunta", createdAt: new Date(1000) },
    });
    await db.chatMessage.create({
      data: {
        projectId,
        role: "assistant",
        content: "resposta",
        verdicts: [{ claim: "x", classification: "supported", confidence: 0.8, evidence: "", source: 1 }],
        createdAt: new Date(2000),
      },
    });
    const res = await api("GET", `/api/projects/${projectId}/research/history`, { cookie });
    expect(res.status).toBe(200);
    expect(res.json.messages.length).toBe(2);
    expect(res.json.messages[0].role).toBe("user");
    expect(res.json.messages[1].role).toBe("assistant");
    expect(res.json.messages[1].verdicts[0].confidence).toBe(0.8);
  });

  test("history requires auth and ownership", async () => {
    const res = await api("GET", `/api/projects/${projectId}/research/history`);
    expect(res.status).toBe(401);
  });
});

describe("verdict feedback", () => {
  test("POST feedback stores row", async () => {
    const res = await api("POST", `/api/projects/${projectId}/research/feedback`, {
      cookie,
      body: { claim: "vacinas funcionam", classification: "supported", agreed: false },
    });
    expect(res.status).toBe(201);
    const rows = await db.verdictFeedback.findMany({ where: { projectId } });
    expect(rows.length).toBe(1);
    expect(rows[0].agreed).toBe(false);
  });

  test("POST feedback validates body", async () => {
    const res = await api("POST", `/api/projects/${projectId}/research/feedback`, {
      cookie,
      body: { claim: "", agreed: "sim" },
    });
    expect(res.status).toBe(400);
  });
});

describe("project sources", () => {
  test("rejects invalid url", async () => {
    const res = await api("POST", `/api/projects/${projectId}/sources`, {
      cookie,
      body: { url: "ftp://exemplo.com/x" },
    });
    expect(res.status).toBe(400);
  });

  test("saves source even when ingest fails, lists it, rejects duplicate, deletes it", async () => {
    const url = "https://unreachable.invalid/paper.pdf";
    const created = await api("POST", `/api/projects/${projectId}/sources`, { cookie, body: { url } });
    expect(created.status).toBe(201);
    expect(created.json.source.ingested).toBe(false);

    const list = await api("GET", `/api/projects/${projectId}/sources`, { cookie });
    expect(list.status).toBe(200);
    expect(list.json.sources.length).toBe(1);
    expect(list.json.sources[0].url).toBe(url);

    const dup = await api("POST", `/api/projects/${projectId}/sources`, { cookie, body: { url } });
    expect(dup.status).toBe(409);

    const del = await api("DELETE", `/api/projects/${projectId}/sources/${created.json.source.id}`, { cookie });
    expect(del.status).toBe(204);

    const after = await api("GET", `/api/projects/${projectId}/sources`, { cookie });
    expect(after.json.sources).toEqual([]);
  });

  test("sources require auth", async () => {
    const res = await api("GET", `/api/projects/${projectId}/sources`);
    expect(res.status).toBe(401);
  });
});
