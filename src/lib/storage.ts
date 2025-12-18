import { writeFile, mkdir } from "fs/promises";
import { join } from "path";
import { existsSync } from "fs";

const UPLOAD_DIR = process.env.UPLOAD_DIR || join(process.cwd(), "uploads");
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

/**
 * Ensures the upload directory exists
 */
async function ensureUploadDir(): Promise<void> {
  if (!existsSync(UPLOAD_DIR)) {
    await mkdir(UPLOAD_DIR, { recursive: true });
  }
}

/**
 * Generates a unique file path for storing uploaded documents
 */
function generateFilePath(clientId: string, fileName: string): string {
  const timestamp = Date.now();
  const sanitizedFileName = fileName.replace(/[^a-zA-Z0-9.-]/g, "_");
  const fileExtension = sanitizedFileName.split(".").pop() || "";
  const baseName = sanitizedFileName.replace(/\.[^/.]+$/, "");
  const uniqueFileName = `${clientId}_${timestamp}_${baseName}.${fileExtension}`;
  
  // Organize by date (YYYY/MM)
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  
  return join(year.toString(), month, uniqueFileName);
}

/**
 * Stores a file and returns the storage path
 */
export async function storeFile(
  file: File,
  clientId: string
): Promise<{ filePath: string; fullPath: string }> {
  await ensureUploadDir();
  
  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);
  
  if (buffer.length > MAX_FILE_SIZE) {
    throw new Error(`File size exceeds maximum of ${MAX_FILE_SIZE} bytes`);
  }
  
  const relativePath = generateFilePath(clientId, file.name);
  const fullPath = join(UPLOAD_DIR, relativePath);
  
  // Ensure directory exists
  const dirPath = join(UPLOAD_DIR, relativePath.split("/").slice(0, -1).join("/"));
  if (!existsSync(dirPath)) {
    await mkdir(dirPath, { recursive: true });
  }
  
  await writeFile(fullPath, buffer);
  
  return {
    filePath: relativePath, // Relative path for database
    fullPath, // Full path for file access
  };
}

/**
 * Gets the full file path from a stored file path
 */
export function getFullFilePath(relativePath: string): string {
  return join(UPLOAD_DIR, relativePath);
}

/**
 * For production, you would replace this with cloud storage:
 * - AWS S3
 * - Google Cloud Storage
 * - Azure Blob Storage
 * - Supabase Storage
 * 
 * Example S3 implementation:
 * 
 * import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
 * 
 * const s3Client = new S3Client({ region: process.env.AWS_REGION });
 * 
 * export async function storeFile(file: File, clientId: string) {
 *   const buffer = Buffer.from(await file.arrayBuffer());
 *   const key = generateFilePath(clientId, file.name);
 *   
 *   await s3Client.send(new PutObjectCommand({
 *     Bucket: process.env.S3_BUCKET_NAME,
 *     Key: key,
 *     Body: buffer,
 *     ContentType: file.type,
 *   }));
 *   
 *   return {
 *     filePath: key,
 *     fullPath: `s3://${process.env.S3_BUCKET_NAME}/${key}`,
 *   };
 * }
 */

