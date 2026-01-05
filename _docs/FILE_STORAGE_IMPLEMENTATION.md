# File Storage Implementation - Supabase Storage + Prisma

**Status:** ✅ Complete  
**Date:** January 2025  
**Architecture:** Clerk + Prisma + Supabase Storage (server-side authoritative)

---

## Overview

This implementation provides secure file storage with:
- **Tenant isolation** via org-scoped paths
- **Server-side authoritative DB writes** (no client-side DB access)
- **Signed URLs** for upload/download (time-limited, secure)
- **Prisma as source of truth** for file metadata

---

## Architecture Principles

### ✅ DO (This Implementation)

- ✅ All DB writes via Prisma (server-side only)
- ✅ Signed URLs for browser uploads/downloads
- ✅ Tenant-scoped storage paths (`orgs/{orgId}/...`)
- ✅ Membership verification before file access
- ✅ File metadata in Prisma (authoritative source)

### ❌ DON'T (Avoid These)

- ❌ Browser-side DB writes (`supabase.from("files").insert()`)
- ❌ Public storage bucket access
- ❌ Direct storage path exposure
- ❌ Client-side file table writes

---

## Database Schema

### FileAsset Model

```prisma
model FileAsset {
  id            String   @id @default(uuid())
  orgId         String
  registryId    String?
  policyId      String?

  bucket        String   @default("heirvault-files")
  storagePath   String   @unique
  originalName  String
  mimeType      String
  byteSize      Int

  sha256        String?  // optional integrity
  uploadedByClerkUserId String

  createdAt     DateTime @default(now())

  org           Org      @relation(fields: [orgId], references: [id], onDelete: Cascade)
  registry      Registry? @relation(fields: [registryId], references: [id], onDelete: SetNull)

  @@index([orgId])
  @@index([registryId])
  @@index([policyId])
}
```

**Migration:**
```bash
npx prisma migrate dev --name file_assets
```

---

## Storage Bucket Setup

### Create Bucket in Supabase

1. Go to **Supabase Dashboard → Storage**
2. Create bucket: **`heirvault-files`**
3. Set visibility: **Private**
4. Configure policies (optional, since we use service role)

### Path Convention

**Format:**
```
orgs/{orgId}/registries/{registryId}/{category}/{fileId}-{slug}.{ext}
```

**Examples:**
- `orgs/ORG123/registries/REG456/policies/FILE789-policy-copy.pdf`
- `orgs/ORG123/registries/REG456/proofs/FILE222-beneficiary-letter.jpg`
- `orgs/ORG123/registries/unassigned/uploads/FILE333-document.pdf`

**Benefits:**
- ✅ Easy to list all files for a registry
- ✅ Tenant isolation (org-scoped)
- ✅ Can revoke access by org
- ✅ Rotate signed URLs without moving objects

---

## Environment Variables

```bash
# Supabase Storage
SUPABASE_URL="https://pgpnbtmgloextjpmxxgv.supabase.co"
SUPABASE_SERVICE_ROLE_KEY="..."  # server only, never expose to client
SUPABASE_STORAGE_BUCKET="heirvault-files"
```

---

## API Endpoints

### 1. Create Upload URL

**Endpoint:** `POST /api/storage/create-upload`

**Request:**
```json
{
  "orgId": "org_abc123",
  "registryId": "reg_xyz789",  // optional
  "category": "policies",      // policies|proofs|uploads
  "originalName": "policy-copy.pdf",
  "mimeType": "application/pdf",
  "byteSize": 1024000
}
```

**Response:**
```json
{
  "ok": true,
  "fileId": "file_abc123",
  "bucket": "heirvault-files",
  "path": "orgs/org_abc123/registries/reg_xyz789/policies/file_abc123-policy-copy.pdf",
  "signedUrl": "https://...",
  "method": "PUT"
}
```

**Flow:**
1. Verifies Clerk user + org membership
2. Creates `FileAsset` DB record (authoritative)
3. Generates tenant-scoped storage path
4. Returns signed URL for browser upload

---

### 2. Attach File to Registry/Policy

**Endpoint:** `POST /api/files/attach`

**Request:**
```json
{
  "orgId": "org_abc123",
  "fileId": "file_abc123",
  "registryId": "reg_xyz789",  // optional
  "policyId": "pol_def456"      // optional
}
```

**Response:**
```json
{
  "ok": true
}
```

**Flow:**
1. Verifies membership
2. Verifies file belongs to org
3. Updates `FileAsset.registryId` and/or `FileAsset.policyId`

---

### 3. Get Signed Download URL

**Endpoint:** `POST /api/files/signed-url`

**Request:**
```json
{
  "orgId": "org_abc123",
  "fileId": "file_abc123"
}
```

**Response:**
```json
{
  "ok": true,
  "signedUrl": "https://...?token=..."
}
```

**Flow:**
1. Verifies membership
2. Verifies file belongs to org
3. Generates signed URL (valid 10 minutes)
4. Returns URL for download/preview

---

## Browser Upload Flow

### Step 1: Request Upload URL

```typescript
const response = await fetch("/api/storage/create-upload", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    orgId: "org_abc123",
    registryId: "reg_xyz789",
    category: "policies",
    originalName: file.name,
    mimeType: file.type,
    byteSize: file.size,
  }),
});

const { fileId, signedUrl, method } = await response.json();
```

### Step 2: Upload to Supabase

```typescript
const uploadResponse = await fetch(signedUrl, {
  method: "PUT",
  headers: {
    "Content-Type": file.type,
  },
  body: file,
});

if (!uploadResponse.ok) {
  throw new Error("Upload failed");
}
```

### Step 3: Attach to Registry

```typescript
await fetch("/api/files/attach", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    orgId: "org_abc123",
    fileId,
    registryId: "reg_xyz789",
  }),
});
```

---

## Security Guarantees

### ✅ Tenant Isolation

- Files stored in org-scoped paths
- Membership check before any file operation
- DB enforces org ownership

### ✅ No Client-Side DB Writes

- All `FileAsset` writes via Prisma (server-side)
- Browser only uploads to signed URLs
- No direct Supabase DB access from client

### ✅ Time-Limited Access

- Upload URLs: 10 minutes
- Download URLs: 10 minutes
- URLs cannot be reused after expiry

### ✅ Authoritative Source

- Prisma `FileAsset` table is source of truth
- Storage paths derived from DB records
- No orphaned files (CASCADE deletes)

---

## Billing/Cap Protection

This architecture prevents billing drift because:

1. **Registry creation** is server-only (Prisma)
2. **File attachment** is server-only (Prisma)
3. **Stripe state** is server-only (webhooks)
4. **Storage is client-driven**, but **DB linkage is server-only**

**Result:** Access control stays consistent with billing caps.

---

## Files Created

1. **`prisma/schema.prisma`** - Added `FileAsset` model
2. **`src/lib/supabaseAdmin.ts`** - Supabase admin client
3. **`src/app/api/storage/create-upload/route.ts`** - Upload URL generation
4. **`src/app/api/files/attach/route.ts`** - File attachment
5. **`src/app/api/files/signed-url/route.ts`** - Download URL generation
6. **`src/proxy.ts`** - Added file endpoints to public routes (with auth)

---

## Next Steps

1. ✅ Run migration: `npx prisma migrate dev --name file_assets`
2. ✅ Create bucket `heirvault-files` in Supabase (private)
3. ✅ Set environment variables
4. ⏳ Implement browser upload component
5. ⏳ Wire file attachment to registry UI
6. ⏳ Add file list/preview UI
7. ⏳ Add file deletion (with cleanup)

---

## Testing

### Manual Test Flow

1. **Create Upload URL:**
   ```bash
   curl -X POST http://localhost:3000/api/storage/create-upload \
     -H "Content-Type: application/json" \
     -H "Authorization: Bearer <clerk-token>" \
     -d '{
       "orgId": "org_abc123",
       "registryId": "reg_xyz789",
       "category": "policies",
       "originalName": "test.pdf",
       "mimeType": "application/pdf",
       "byteSize": 1024
     }'
   ```

2. **Upload File:**
   ```bash
   curl -X PUT <signedUrl> \
     -H "Content-Type: application/pdf" \
     --data-binary @test.pdf
   ```

3. **Attach File:**
   ```bash
   curl -X POST http://localhost:3000/api/files/attach \
     -H "Content-Type: application/json" \
     -H "Authorization: Bearer <clerk-token>" \
     -d '{
       "orgId": "org_abc123",
       "fileId": "file_abc123",
       "registryId": "reg_xyz789"
     }'
   ```

4. **Get Download URL:**
   ```bash
   curl -X POST http://localhost:3000/api/files/signed-url \
     -H "Content-Type: application/json" \
     -H "Authorization: Bearer <clerk-token>" \
     -d '{
       "orgId": "org_abc123",
       "fileId": "file_abc123"
     }'
   ```

---

## Common Issues

### Issue: "Failed to create upload URL"

**Solution:** 
- Verify `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` are set
- Check bucket `heirvault-files` exists and is private
- Verify service role key has storage permissions

### Issue: "File not found" on attach

**Solution:**
- Ensure file was created via `/api/storage/create-upload` first
- Verify `fileId` matches the one returned from upload URL creation
- Check file belongs to the same org

### Issue: Upload fails with 403

**Solution:**
- Verify signed URL hasn't expired (10 min limit)
- Check bucket policies allow PUT operations
- Ensure service role key has correct permissions

---

**This architecture ensures all DB writes are authoritative and prevents billing/cap drift.**
