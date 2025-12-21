# Policy Intake, Verification, and Registry System

## Overview

This system provides three interconnected pages for policy management:

1. **Policy Intake / Upload Page** - Client-facing, no account required
2. **Document Processing & Verification Page** - Attorney view for verification
3. **Registry Record Detail Page** - Authoritative policy record

## 1. Policy Intake / Upload Page

**Route:** `/policy-intake`

**Access:** Public (no authentication required)

**Function:** Frictionless intake of life insurance information

### Features

- **Document Upload**: Upload PDF or image files for automated extraction
- **Manual Entry**: Enter policy details manually if preferred
- **OCR Extraction**: Automatic data extraction from uploaded documents
- **No Account Required**: Deliberately avoids logins to reduce abandonment
- **Cryptographic Receipt**: Generates receipt with hash for proof of submission

### User Flow

1. User visits `/policy-intake`
2. Optionally uploads policy document
3. System extracts data automatically (if document provided)
4. User reviews and completes form
5. Submits policy information
6. Receives cryptographic receipt with QR code

### API Endpoints

- `POST /api/policy-intake/extract` - Extract data from document
- `POST /api/policy-intake/submit` - Submit policy intake

## 2. Document Processing & Verification Page

**Route:** `/dashboard/policies/[id]/verification`

**Access:** Attorney-only (requires authentication)

**Function:** Validation and verification of extracted policy data

### Features

- **Extracted Data Display**: Shows OCR-extracted information
- **Source Document View**: View original uploaded documents
- **Verification Actions**:
  - Verify (mark as verified)
  - Flag Discrepancy
  - Mark Incomplete
  - Reject
- **Verification Notes**: Add notes about verification, discrepancies, or follow-ups
- **Submission History**: View all submissions for the client
- **Document Hashes**: Cryptographic hashes for integrity verification

### Verification Statuses

- **PENDING**: Awaiting verification
- **VERIFIED**: Verified and approved
- **DISCREPANCY**: Issues found, needs follow-up
- **INCOMPLETE**: Missing required information
- **REJECTED**: Rejected (invalid or incorrect)

### API Endpoints

- `POST /api/policies/[id]/verify` - Update verification status

## 3. Registry Record Detail Page

**Route:** `/dashboard/policies/[id]/registry`

**Access:** Attorney-only (requires authentication)

**Function:** Long-term preservation and controlled disclosure

### Features

- **Authoritative Record**: Single source of truth for policy existence
- **Complete History**: Submission history, access logs, receipts
- **Document Hashes**: Cryptographic proof of document integrity
- **Verification Status**: Current verification state
- **Access Logs**: Complete audit trail of who accessed what and when
- **Receipts**: All receipts generated for this policy
- **Structured Data**: All policy information in structured format

### Key Question Answered

**"Does a policy exist, and where?"**

This page provides the definitive answer with:
- Policy record with verification status
- Source documents with cryptographic hashes
- Complete submission and access history
- Receipts proving submission

## Database Schema Updates

### Policies Table

Added fields:
- `verification_status` - Enum: PENDING, VERIFIED, DISCREPANCY, INCOMPLETE, REJECTED
- `verified_at` - Timestamp of verification
- `verified_by_user_id` - User who verified
- `verification_notes` - Notes about verification
- `document_hash` - SHA-256 hash of source document

### Documents Table

Added fields:
- `document_hash` - SHA-256 hash for cryptographic integrity (required)
- `verified_at` - Timestamp of document verification
- `verified_by_user_id` - User who verified document
- `verification_notes` - Notes about document verification

## Cryptographic Features

### Document Hashing

- All documents receive a SHA-256 hash upon upload
- Hash is stored in both `documents` and `policies` tables
- Provides immutable proof of document integrity

### Receipt Generation

- Receipts include cryptographic hashes
- Links to policy and client records
- QR codes for easy access to update pages

## Workflow

### Intake Workflow

1. Client submits policy via `/policy-intake`
2. Document uploaded (if provided)
3. OCR extraction performed
4. Client data and policy data stored
5. Document hash generated
6. Receipt generated with QR code
7. Policy status: PENDING verification

### Verification Workflow

1. Attorney accesses `/dashboard/policies/[id]/verification`
2. Reviews extracted data vs. source documents
3. Verifies carrier identity
4. Checks policy status and completeness
5. Flags any discrepancies
6. Updates verification status
7. Adds verification notes

### Registry Workflow

1. Attorney accesses `/dashboard/policies/[id]/registry`
2. Views complete authoritative record
3. Reviews all documents, hashes, and history
4. Accesses receipts and access logs
5. Answers: "Does this policy exist, and where?"

## Security & Audit

- **Access Logs**: All access to policies is logged
- **Verification Tracking**: Who verified what and when
- **Document Integrity**: Cryptographic hashes prevent tampering
- **Audit Trail**: Complete history of all actions
- **Evidentiary Integrity**: Designed for legal defensibility

## Migration

Run the migration to add verification fields:

```sql
-- See: prisma/migrations/20250121000001_add_verification_fields/migration.sql
```

## Integration Points

- **Policy Intake** → Creates policies with PENDING status
- **Verification** → Updates policy verification status
- **Registry** → Displays complete authoritative record
- **Receipts** → Generated for all submissions
- **Audit Logs** → Track all access and changes

