# Policy Submission Form Setup Guide

This guide walks you through setting up the public policy submission form at `/submit-policy`.

## Overview

The policy submission form allows agents to submit policy information and PDF documents without requiring user accounts. Submissions are stored in Supabase with unique reference IDs.

## Prerequisites

- Supabase project configured
- Environment variables set (see below)
- Storage bucket created
- Database migration applied

## Step 1: Environment Variables

Ensure these are set in your `.env.local` (local) or Vercel environment (production):

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

**Important:** The service role key is server-only and must never be exposed to the client.

## Step 2: Create Supabase Storage Bucket

1. Go to Supabase Dashboard → Storage
2. Click "Create bucket"
3. Configure:
   - **Name:** `policy-submissions`
   - **Public:** No (Private)
   - **File size limit:** 50MB (or as needed)
   - **Allowed MIME types:** `application/pdf`

4. Click "Create bucket"

## Step 3: Set Storage Bucket Policies

The bucket should be private. Access is controlled via the service role key in server-side API routes.

### Optional: If you need signed URLs for downloads

Create a storage policy for authenticated users (if you add a download feature later):

```sql
-- Example: Allow authenticated users to read files
CREATE POLICY "Authenticated users can read submissions"
ON storage.objects
FOR SELECT
USING (
  bucket_id = 'policy-submissions' AND
  auth.role() = 'authenticated'
);
```

For now, the bucket can remain fully private since files are only accessed server-side.

## Step 4: Run Database Migration

Apply the migration to create the `policy_submissions` table:

### Option A: Using Supabase CLI (Recommended)

```bash
# If you have Supabase CLI installed
supabase db push

# Or apply specific migration
supabase migration up
```

### Option B: Using Supabase Dashboard

1. Go to Supabase Dashboard → SQL Editor
2. Copy the contents of `supabase/migrations/create_policy_submissions_table.sql`
3. Paste and run the SQL

### Option C: Direct SQL

Run this SQL in your Supabase SQL Editor:

```sql
CREATE TABLE IF NOT EXISTS policy_submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reference_id TEXT UNIQUE NOT NULL,
  insured_name TEXT NOT NULL,
  dob DATE,
  carrier TEXT,
  policy_number TEXT,
  submitted_by_email TEXT NOT NULL,
  file_path TEXT NOT NULL,
  source TEXT DEFAULT 'web',
  status TEXT DEFAULT 'received',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_policy_submissions_reference_id ON policy_submissions(reference_id);
CREATE INDEX IF NOT EXISTS idx_policy_submissions_email ON policy_submissions(submitted_by_email);
CREATE INDEX IF NOT EXISTS idx_policy_submissions_status ON policy_submissions(status);
CREATE INDEX IF NOT EXISTS idx_policy_submissions_created_at ON policy_submissions(created_at DESC);

ALTER TABLE policy_submissions ENABLE ROW LEVEL SECURITY;
```

## Step 5: Test the Form

1. Start your development server:
   ```bash
   npm run dev
   ```

2. Navigate to: `http://localhost:3000/submit-policy`

3. Fill out the form:
   - Insured Full Legal Name (required)
   - Date of Birth (optional)
   - Carrier Name (optional)
   - Policy Number (optional)
   - Your Email Address (required)
   - Upload PDF (required)

4. Submit the form

5. You should see: `Submission received. Reference ID: HV-2026-000001`

## Step 6: Verify Submission

### Check Database

1. Go to Supabase Dashboard → Table Editor
2. Select `policy_submissions` table
3. You should see a new row with:
   - `reference_id`: `HV-2026-000001` (or similar)
   - `insured_name`: The name you entered
   - `submitted_by_email`: The email you entered
   - `status`: `received`
   - `file_path`: Path to the uploaded file

### Check Storage

1. Go to Supabase Dashboard → Storage
2. Open the `policy-submissions` bucket
3. Navigate to `submissions/HV-2026-000001/`
4. You should see the uploaded PDF file

## Reference ID Format

Reference IDs follow the format: `HV-YYYY-NNNNNN`

- `HV`: HeirVault prefix
- `YYYY`: Current year
- `NNNNNN`: 6-digit sequential number (zero-padded)

Example: `HV-2026-000001`, `HV-2026-000002`, etc.

## File Storage Structure

Files are stored in Supabase Storage with this structure:

```
policy-submissions/
  └── submissions/
      └── HV-2026-000001/
          └── filename.pdf
      └── HV-2026-000002/
          └── filename.pdf
```

## API Endpoint

**POST** `/api/submit-policy`

### Request

- Content-Type: `multipart/form-data`
- Fields:
  - `insured_name` (required): string
  - `dob` (optional): date (YYYY-MM-DD)
  - `carrier` (optional): string
  - `policy_number` (optional): string
  - `submitted_by_email` (required): email
  - `file` (required): PDF file (max 50MB)

### Response

**Success (201):**
```json
{
  "reference_id": "HV-2026-000001"
}
```

**Error (400/500):**
```json
{
  "error": "Error message"
}
```

## Error Handling

Common errors and solutions:

### "No file uploaded"
- Ensure the form includes a file input with `name="file"`
- Check that the file is actually selected

### "Only PDF files are accepted"
- The file must have MIME type `application/pdf`
- Ensure the file is actually a PDF

### "File size exceeds 50MB limit"
- Reduce file size or increase limit in code
- Consider compressing the PDF

### "Failed to upload file"
- Check Supabase Storage bucket exists
- Verify `SUPABASE_SERVICE_ROLE_KEY` is correct
- Check bucket permissions

### "Failed to save submission"
- Verify database migration was applied
- Check database connection
- Review server logs for specific error

## Security Considerations

1. **Service Role Key**: Never expose `SUPABASE_SERVICE_ROLE_KEY` to the client
2. **File Validation**: Only PDF files are accepted
3. **File Size**: 50MB limit prevents abuse
4. **RLS**: Table has RLS enabled (defense in depth)
5. **Email Validation**: Basic email format validation
6. **File Naming**: File names are sanitized to prevent path traversal

## Next Steps

After submissions are received:

1. **Review submissions** in Supabase Dashboard
2. **Issue Submission Confirmation Receipt PDF** (to be implemented)
3. **Email confirmation** from Proton Mail (to be implemented)
4. **Log completion** in your SOP

## Troubleshooting

### Form doesn't submit

- Check browser console for errors
- Verify API route is accessible: `http://localhost:3000/api/submit-policy`
- Check network tab for request/response

### Database errors

- Verify migration was applied: Check `policy_submissions` table exists
- Check Supabase connection: Verify environment variables
- Review server logs for specific SQL errors

### Storage errors

- Verify bucket exists: `policy-submissions`
- Check bucket is private (correct for this use case)
- Verify service role key has storage access

## Production Deployment

Before deploying to production:

1. ✅ Environment variables set in Vercel
2. ✅ Storage bucket created in production Supabase project
3. ✅ Migration applied to production database
4. ✅ Test submission works in production
5. ✅ Monitor error logs for issues

## Support

For issues or questions:
- Check server logs: `npm run dev` shows errors
- Check Supabase logs: Dashboard → Logs
- Review this documentation
- Check GitHub issues
