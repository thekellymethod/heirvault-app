-- Create policy_submissions table for web form submissions
-- This table stores policy submissions from the public web form

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

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_policy_submissions_reference_id ON policy_submissions(reference_id);
CREATE INDEX IF NOT EXISTS idx_policy_submissions_email ON policy_submissions(submitted_by_email);
CREATE INDEX IF NOT EXISTS idx_policy_submissions_status ON policy_submissions(status);
CREATE INDEX IF NOT EXISTS idx_policy_submissions_created_at ON policy_submissions(created_at DESC);

-- Add comment
COMMENT ON TABLE policy_submissions IS 'Stores policy submissions from the public web form. Each submission has a unique reference ID and links to a file in Supabase Storage.';

-- Enable Row Level Security
ALTER TABLE policy_submissions ENABLE ROW LEVEL SECURITY;

-- Policy: Only service role can read/write (server-side only)
-- This table is not exposed to client-side queries
CREATE POLICY "Service role only access"
  ON policy_submissions
  FOR ALL
  USING (false)
  WITH CHECK (false);

-- Note: In practice, this table is accessed only via server-side API routes
-- using the service role key. RLS is enabled for defense in depth.
