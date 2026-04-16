-- Extend policy_submissions for detailed public form + receipt QR token

ALTER TABLE policy_submissions
  ADD COLUMN IF NOT EXISTS receipt_token uuid,
  ADD COLUMN IF NOT EXISTS insured_first_name text,
  ADD COLUMN IF NOT EXISTS insured_middle_name text,
  ADD COLUMN IF NOT EXISTS insured_last_name text,
  ADD COLUMN IF NOT EXISTS contact_phone text,
  ADD COLUMN IF NOT EXISTS submitted_by_phone text,
  ADD COLUMN IF NOT EXISTS id_last_four text,
  ADD COLUMN IF NOT EXISTS dl_number text,
  ADD COLUMN IF NOT EXISTS carrier_phone text,
  ADD COLUMN IF NOT EXISTS carrier_street text,
  ADD COLUMN IF NOT EXISTS carrier_city text,
  ADD COLUMN IF NOT EXISTS carrier_state text,
  ADD COLUMN IF NOT EXISTS carrier_zip text;

UPDATE policy_submissions SET receipt_token = gen_random_uuid() WHERE receipt_token IS NULL;

ALTER TABLE policy_submissions ALTER COLUMN receipt_token SET DEFAULT gen_random_uuid();
ALTER TABLE policy_submissions ALTER COLUMN receipt_token SET NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS policy_submissions_receipt_token_uidx ON policy_submissions (receipt_token);

CREATE INDEX IF NOT EXISTS idx_policy_submissions_receipt_token ON policy_submissions (receipt_token);

COMMENT ON COLUMN policy_submissions.receipt_token IS 'Public receipt URL token; embed in QR.';
