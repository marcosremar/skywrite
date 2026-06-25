import type { S3Client } from "@aws-sdk/client-s3";

function config() {
  const { B2_ENDPOINT, B2_REGION, B2_KEY_ID, B2_APP_KEY, B2_BUCKET } = process.env;
  if (!B2_ENDPOINT || !B2_REGION || !B2_KEY_ID || !B2_APP_KEY || !B2_BUCKET) return null;
  return {
    endpoint: B2_ENDPOINT,
    region: B2_REGION,
    keyId: B2_KEY_ID,
    appKey: B2_APP_KEY,
    bucket: B2_BUCKET,
  };
}

export function isStorageConfigured() {
  return config() !== null;
}

let client: S3Client | null = null;
async function clientFor(c: NonNullable<ReturnType<typeof config>>) {
  if (!client) {
    const { S3Client } = await import("@aws-sdk/client-s3");
    client = new S3Client({
      endpoint: c.endpoint,
      region: c.region,
      credentials: { accessKeyId: c.keyId, secretAccessKey: c.appKey },
    });
  }
  return client;
}

export async function uploadPdf(key: string, body: Buffer) {
  const c = config();
  if (!c) throw new Error("Storage not configured");
  const { PutObjectCommand } = await import("@aws-sdk/client-s3");
  const s3 = await clientFor(c);
  await s3.send(
    new PutObjectCommand({ Bucket: c.bucket, Key: key, Body: body, ContentType: "application/pdf" })
  );
}

export async function downloadPdf(key: string): Promise<Buffer> {
  const c = config();
  if (!c) throw new Error("Storage not configured");
  const { GetObjectCommand } = await import("@aws-sdk/client-s3");
  const s3 = await clientFor(c);
  const res = await s3.send(new GetObjectCommand({ Bucket: c.bucket, Key: key }));
  if (!res.Body) throw new Error("Empty response body from storage");
  const bytes = await res.Body.transformToByteArray();
  return Buffer.from(bytes);
}

export async function deletePdf(key: string) {
  const c = config();
  if (!c) return;
  const { DeleteObjectCommand } = await import("@aws-sdk/client-s3");
  const s3 = await clientFor(c);
  await s3.send(new DeleteObjectCommand({ Bucket: c.bucket, Key: key }));
}
