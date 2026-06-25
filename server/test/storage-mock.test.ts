import { afterAll, beforeAll, describe, expect, mock, test } from "bun:test";
import { uploadPdf, downloadPdf, deletePdf } from "../src/lib/storage.js";

const sent: Array<{ type: string; input: Record<string, unknown> }> = [];

mock.module("@aws-sdk/client-s3", () => ({
  S3Client: class {
    constructor(public cfg: unknown) {}
    async send(cmd: { type: string; input: Record<string, unknown> }) {
      sent.push(cmd);
      if (cmd.type === "get") {
        return { Body: { transformToByteArray: async () => new Uint8Array([1, 2, 3]) } };
      }
      return {};
    }
  },
  PutObjectCommand: class {
    type = "put";
    constructor(public input: Record<string, unknown>) {}
  },
  GetObjectCommand: class {
    type = "get";
    constructor(public input: Record<string, unknown>) {}
  },
  DeleteObjectCommand: class {
    type = "del";
    constructor(public input: Record<string, unknown>) {}
  },
}));

const keys = ["B2_ENDPOINT", "B2_REGION", "B2_KEY_ID", "B2_APP_KEY", "B2_BUCKET"];
const saved: Record<string, string | undefined> = {};

beforeAll(() => {
  for (const k of keys) {
    saved[k] = process.env[k];
    process.env[k] = `test-${k}`;
  }
  process.env.B2_BUCKET = "my-bucket";
});

afterAll(() => {
  for (const k of keys) {
    if (saved[k] === undefined) delete process.env[k];
    else process.env[k] = saved[k];
  }
  mock.restore();
});

describe("storage S3 operations (mocked)", () => {
  test("uploadPdf sends PutObject with bucket, key and pdf content-type", async () => {
    sent.length = 0;
    await uploadPdf("builds/p/b.pdf", Buffer.from("pdfdata"));
    const put = sent.find((c) => c.type === "put");
    expect(put).toBeDefined();
    expect(put!.input.Bucket).toBe("my-bucket");
    expect(put!.input.Key).toBe("builds/p/b.pdf");
    expect(put!.input.ContentType).toBe("application/pdf");
  });

  test("downloadPdf returns the object bytes", async () => {
    sent.length = 0;
    const buf = await downloadPdf("builds/p/b.pdf");
    expect(Array.from(buf)).toEqual([1, 2, 3]);
    expect(sent.find((c) => c.type === "get")!.input.Key).toBe("builds/p/b.pdf");
  });

  test("deletePdf sends DeleteObject", async () => {
    sent.length = 0;
    await deletePdf("builds/p/b.pdf");
    const del = sent.find((c) => c.type === "del");
    expect(del!.input.Bucket).toBe("my-bucket");
    expect(del!.input.Key).toBe("builds/p/b.pdf");
  });
});
