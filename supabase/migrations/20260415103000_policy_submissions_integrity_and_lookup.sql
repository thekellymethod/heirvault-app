-- Tighten policy_submissions data integrity and lookup performance
-- Supports /api/submit-policy and /api/receipts/[receiptId]/lookup flows.

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'policy_submissions_contact_phone_format_chk'
  ) THEN
    ALTER TABLE policy_submissions
      ADD CONSTRAINT policy_submissions_contact_phone_format_chk
      CHECK (contact_phone ~ '^[0-9]{3}-[0-9]{3}-[0-9]{4}$');
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'policy_submissions_submitted_by_phone_format_chk'
  ) THEN
    ALTER TABLE policy_submissions
      ADD CONSTRAINT policy_submissions_submitted_by_phone_format_chk
      CHECK (
        submitted_by_phone IS NULL
        OR submitted_by_phone ~ '^[0-9]{3}-[0-9]{3}-[0-9]{4}$'
      );
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'policy_submissions_carrier_phone_format_chk'
  ) THEN
    ALTER TABLE policy_submissions
      ADD CONSTRAINT policy_submissions_carrier_phone_format_chk
      CHECK (carrier_phone ~ '^[0-9]{3}-[0-9]{3}-[0-9]{4}$');
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'policy_submissions_carrier_state_format_chk'
  ) THEN
    ALTER TABLE policy_submissions
      ADD CONSTRAINT policy_submissions_carrier_state_format_chk
      CHECK (carrier_state ~ '^[A-Z]{2}$');
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'policy_submissions_carrier_zip_format_chk'
  ) THEN
    ALTER TABLE policy_submissions
      ADD CONSTRAINT policy_submissions_carrier_zip_format_chk
      CHECK (carrier_zip ~ '^[0-9]{5}(-[0-9]{4})?$');
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'policy_submissions_id_last_four_or_dl_chk'
  ) THEN
    ALTER TABLE policy_submissions
      ADD CONSTRAINT policy_submissions_id_last_four_or_dl_chk
      CHECK (
        (id_last_four ~ '^[0-9]{4}$')
        OR (dl_number IS NOT NULL AND btrim(dl_number) <> '')
      );
  END IF;
END
$$;

CREATE INDEX IF NOT EXISTS idx_policy_submissions_receipt_token_lookup
  ON policy_submissions (receipt_token);

CREATE INDEX IF NOT EXISTS idx_policy_submissions_reference_id_lookup
  ON policy_submissions (reference_id);
