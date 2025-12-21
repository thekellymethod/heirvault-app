import { writeFile, mkdir, readFile } from "fs/promises";
import { join } from "path";
import { existsSync } from "fs";
import { generateDocumentHash } from "./document-hash";

const UPLOAD_DIR = process.env.UPLOAD_DIR || join(process.cwd(), "uploads");
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

// Allowed MIME types
const ALLOWED_MIME_TYPES = [
  "application/pdf",
  "image/jpeg",
  "image/jpg",
  "image/png",
] as const;

type AllowedMimeType = typeof ALLOWED_MIME_TYPES[number];

/**
 * Ensures the upload directory exists
 */
async function ensureUploadDir(): Promise<void> {
  if (!existsSync(UPLOAD_DIR)) {
    await mkdir(UPLOAD_DIR, { recursive: true });
  }
}

/**
 * Validate MIME type
 */
function validateMimeType(mimeType: string): mimeType is AllowedMimeType {
  return ALLOWED_MIME_TYPES.includes(mimeType as AllowedMimeType);
}

/**
 * Get file extension from MIME type
 */
function getExtensionFromMimeType(mimeType: string): string {
  const mimeToExt: Record<string, string> = {
    "application/pdf": "pdf",
    "image/jpeg": "jpg",
    "image/jpg": "jpg",
    "image/png": "png",
  };
  return mimeToExt[mimeType] || "bin";
}

/**
 * Generate content-addressed file path
 * 
 * Documents are content-addressed, not user-named.
 * The path is based on the SHA-256 hash of the file content.
 * Same content = same path (immutable, deduplicated).
 * 
 * Format: {hash[0:2]}/{hash[2:4]}/{hash}.{ext}
 * Example: ab/cd/abcdef1234567890...pdf
 */
function generateContentAddressedPath(hash: string, mimeType: string): string {
  // Use first 4 characters for directory structure (prevents too many files in one directory)
  const dir1 = hash.substring(0, 2);
  const dir2 = hash.substring(2, 4);
  const extension = getExtensionFromMimeType(mimeType);
  
  // Full path: {hash}.{ext}
  const fileName = `${hash}.${extension}`;
  
  return join(dir1, dir2, fileName);
}

/**
 * Upload and store a file
 * 
 * Enforce MIME + size
 * Return immutable storage path
 * Compute SHA-256
 * Documents are content-addressed, not user-named
 * 
 * @param file - The file to upload
 * @returns Storage result with content-addressed path and hash
 */
export async function uploadFile(
  file: File
): Promise<{
  filePath: string; // Content-addressed relative path
  fullPath: string; // Full file system path
  hash: string; // SHA-256 hash of file content
  mimeType: string; // Validated MIME type
  size: number; // File size in bytes
}> {
  await ensureUploadDir();
  
  // Enforce MIME type validation
  if (!validateMimeType(file.type)) {
    throw new Error(
      `Invalid MIME type: ${file.type}. Allowed types: ${ALLOWED_MIME_TYPES.join(", ")}`
    );
  }
  
  // Convert to buffer
  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);
  
  // Enforce size limit
  if (buffer.length > MAX_FILE_SIZE) {
    throw new Error(`File size exceeds maximum of ${MAX_FILE_SIZE} bytes (${MAX_FILE_SIZE / 1024 / 1024}MB)`);
  }
  
  if (buffer.length === 0) {
    throw new Error("File is empty");
  }
  
  // Compute SHA-256 hash (content-addressed)
  const hash = generateDocumentHash(buffer);
  
  // Generate content-addressed path (not user-named)
  const relativePath = generateContentAddressedPath(hash, file.type);
  const fullPath = join(UPLOAD_DIR, relativePath);
  
  // Ensure directory exists
  const dirPath = join(UPLOAD_DIR, relativePath.split("/").slice(0, -1).join("/"));
  if (!existsSync(dirPath)) {
    await mkdir(dirPath, { recursive: true });
  }
  
  // Check if file already exists (content-addressed = deduplication)
  if (existsSync(fullPath)) {
    // File with same content already exists - return existing path
    // This provides automatic deduplication
    return {
      filePath: relativePath,
      fullPath,
      hash,
      mimeType: file.type,
      size: buffer.length,
    };
  }
  
  // Write file to content-addressed path
  await writeFile(fullPath, buffer);
  
  return {
    filePath: relativePath, // Immutable, content-addressed path
    fullPath, // Full file system path
    hash, // SHA-256 hash
    mimeType: file.type, // Validated MIME type
    size: buffer.length, // File size
  };
}

/**
 * Gets the full file path from a stored file path
 */
export function getFullFilePath(relativePath: string): string {
  return join(UPLOAD_DIR, relativePath);
}

/**
 * Verify file integrity by comparing stored hash with computed hash
 * 
 * @param filePath - Relative path to the file
 * @param expectedHash - Expected SHA-256 hash
 * @returns True if file integrity is verified
 */
export async function verifyFileIntegrity(
  filePath: string,
  expectedHash: string
): Promise<boolean> {
  try {
    const fullPath = getFullFilePath(filePath);
    
    if (!existsSync(fullPath)) {
      return false;
    }
    
    const buffer = await readFile(fullPath);
    const computedHash = generateDocumentHash(buffer);
    
    return computedHash === expectedHash;
  } catch {
    return false;
  }
}

/**
 * Get file metadata from content-addressed path
 * 
 * @param filePath - Content-addressed relative path
 * @returns File metadata if file exists
 */
export async function getFileMetadata(filePath: string): Promise<{
  hash: string;
  size: number;
  exists: boolean;
} | null> {
  try {
    const fullPath = getFullFilePath(filePath);
    
    if (!existsSync(fullPath)) {
      return null;
    }
    
    const buffer = await readFile(fullPath);
    
    // Extract hash from path (content-addressed path contains hash)
    const pathHash = filePath.split("/").pop()?.replace(/\.[^.]+$/, "") || "";
    
    // Verify hash matches file content
    const computedHash = generateDocumentHash(buffer);
    if (computedHash !== pathHash) {
      // Hash mismatch - file may be corrupted
      return null;
    }
    
    return {
      hash: pathHash, // Hash from path
      size: buffer.length,
      exists: true,
    };
  } catch {
    return null;
  }
}

/**
 * Legacy function for backward compatibility
 * 
 * @deprecated Use uploadFile() instead for content-addressed storage
 */
export async function storeFile(
  file: File,
  identifier: string
): Promise<{ filePath: string; fullPath: string }> {
  const result = await uploadFile(file);
  return {
    filePath: result.filePath,
    fullPath: result.fullPath,
  };
}

/**
 * For production, you would replace this with cloud storage:
 * - AWS S3
 * - Google Cloud Storage
 * - Azure Blob Storage
 * - Supabase Storage
 * 
 * Example S3 implementation with content-addressed storage:
 * 
 * import { S3Client, PutObjectCommand, HeadObjectCommand } from "@aws-sdk/client-s3";
 * 
 * const s3Client = new S3Client({ region: process.env.AWS_REGION });
 * 
 * export async function uploadFile(file: File) {
 *   const buffer = Buffer.from(await file.arrayBuffer());
 *   const hash = generateDocumentHash(buffer);
 *   const key = generateContentAddressedPath(hash, file.type);
 *   
 *   // Check if object already exists (deduplication)
 *   try {
 *     await s3Client.send(new HeadObjectCommand({
 *       Bucket: process.env.S3_BUCKET_NAME,
 *       Key: key,
 *     }));
 *     // File exists - return existing path
 *   } catch {
 *     // File doesn't exist - upload it
 *     await s3Client.send(new PutObjectCommand({
 *       Bucket: process.env.S3_BUCKET_NAME,
 *       Key: key,
 *       Body: buffer,
 *       ContentType: file.type,
 *       Metadata: {
 *         hash: hash,
 *       },
 *     }));
 *   }
 *   
 *   return {
 *     filePath: key,
 *     fullPath: `s3://${process.env.S3_BUCKET_NAME}/${key}`,
 *     hash,
 *     mimeType: file.type,
 *     size: buffer.length,
 *   };
 * }
 */
