// src/lib/storage.ts
import crypto from "crypto";
import { S3Client, PutObjectCommand, GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

const s3 = new S3Client({
  region: process.env.S3_REGION!,
  endpoint: process.env.S3_ENDPOINT!,
  credentials: {
    accessKeyId: process.env.S3_ACCESS_KEY_ID!,
    secretAccessKey: process.env.S3_SECRET_ACCESS_KEY!,
  },
  forcePathStyle: true,
});

export async function putObject(params: {
  key: string;
  body: Buffer;
  contentType: string;
}) {
  const sha256 = crypto.createHash("sha256").update(params.body).digest("hex");

  await s3.send(new PutObjectCommand({
    Bucket: process.env.S3_BUCKET!,
    Key: params.key,
    Body: params.body,
    ContentType: params.contentType,
    // Private by default; bucket policy should enforce
  }));

  return { sha256 };
}

export async function getSignedObjectUrl(key: string, expiresSeconds = 60) {
  const cmd = new GetObjectCommand({
    Bucket: process.env.S3_BUCKET!,
    Key: key,
  });
  return getSignedUrl(s3, cmd, { expiresIn: expiresSeconds });
}

export async function signGetUrl(params: {
  key: string;
  expiresInSeconds: number;
  contentDisposition?: "inline" | "attachment";
  fileName?: string;
}) {
  const cmd = new GetObjectCommand({
    Bucket: process.env.S3_BUCKET!,
    Key: params.key,
    ResponseContentDisposition: `${params.contentDisposition ?? "inline"}${params.fileName ? `; filename="${params.fileName}"` : ""}`,
  });

  return getSignedUrl(s3, cmd, { expiresIn: params.expiresInSeconds });
}

export async function uploadDocument(params: {
  fileBuffer: ArrayBuffer;
  filename: string;
  contentType: string;
}): Promise<{ key: string; sha256: string }> {
  const buffer = Buffer.from(params.fileBuffer);
  const sha256 = crypto.createHash("sha256").update(buffer).digest("hex");
  const key = `documents/${sha256}/${params.filename}`;

  await s3.send(new PutObjectCommand({
    Bucket: process.env.S3_BUCKET!,
    Key: key,
    Body: buffer,
    ContentType: params.contentType,
  }));

  return { key, sha256 };
}