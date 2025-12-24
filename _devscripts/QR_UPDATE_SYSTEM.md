# QR Code Re-Submission / Update System

## Overview

The QR Code Re-Submission / Update Page allows policyholders to update their information by scanning the QR code from their receipt. Each update creates a new version entry, preserving the historical chain rather than overwriting data.

## Key Features

### 1. **Versioned Updates**
- Each update creates a new version entry in the `client_versions` table
- Previous versions are preserved for historical reference
- Complete audit trail of all changes
- Immutable record of data evolution

### 2. **No Account Required**
- Public route - accessible without authentication
- No user accounts needed for policyholders
- Access via QR code scan from receipt
- Token-based access control

### 3. **Historical Chain Preservation**
- Links to previous version via `previous_version_id`
- Version numbers increment sequentially
- Complete data snapshots at each version
- Change tracking (what changed from previous version)

### 4. **Continuity Function**
- Preserves complete history for legal purposes
- Supports disputes and compliance audits
- Maintains chain of custody
- Immutable proof of submission and updates

## Access

### URL Structure
```
/qr-update/[token]
```

Where `[token]` is the client invite token from the receipt QR code.

### QR Code Integration
- Receipts include QR codes that link to `/qr-update/[token]`
- Scanning the QR code takes policyholders directly to the update page
- No authentication required

## Database Schema

### `client_versions` Table

Stores versioned updates with the following structure:

- `id` - Unique version ID
- `client_id` - Reference to client
- `invite_id` - Reference to invite token used
- `version_number` - Sequential version number
- `previous_version_id` - Link to previous version (creates chain)
- `client_data` - Complete client data snapshot (JSON)
- `policies_data` - Policies at this version (JSON)
- `beneficiaries_data` - Beneficiaries at this version (JSON)
- `changes` - What changed from previous version (JSON)
- `submitted_by` - "CLIENT" or "ATTORNEY"
- `submission_method` - "QR_CODE", "EMAIL", "PORTAL", etc.
- `notes` - Optional notes
- `created_at` - Timestamp

## API Endpoints

### `POST /api/qr-update/[token]`

- Public endpoint (no authentication required)
- Accepts client, policies, and beneficiaries data
- Creates new version entry
- Updates current client record
- Returns version number and ID

## Update Flow

1. **Policyholder scans QR code** from receipt
2. **Redirected to** `/qr-update/[token]`
3. **Page loads** current client data
4. **Policyholder makes changes** to information
5. **Submits update** via form
6. **System creates** new version entry:
   - Calculates changes from previous version
   - Stores complete data snapshot
   - Links to previous version
   - Updates current client record
7. **Success page** confirms submission
8. **Attorney notified** of update

## Version History

Each update creates a new version with:
- **Version Number**: Sequential (1, 2, 3, ...)
- **Previous Version Link**: Creates immutable chain
- **Complete Snapshot**: Full data at that point in time
- **Change Tracking**: What specifically changed
- **Timestamp**: When the update was submitted
- **Submission Method**: How it was submitted (QR_CODE, etc.)

## Legal Defensibility

The versioning system provides:
- **Immutable History**: Cannot be altered or deleted
- **Complete Chain**: Every version links to previous
- **Change Tracking**: Exact changes documented
- **Timestamps**: Precise timing of each update
- **Actor Tracking**: Who submitted (CLIENT/ATTORNEY)
- **Method Tracking**: How it was submitted

## Migration

Run the migration to create the `client_versions` table:

```sql
-- See: prisma/migrations/20250121000000_add_client_versions/migration.sql
```

## Integration Points

### Receipt Generation

- Receipts now include QR codes linking to `/qr-update/[token]`
- Updated in all receipt generation endpoints:
  - `/api/invite/[token]/receipt-pdf`
  - `/api/invite/[token]/upload-policy`
  - `/api/invite/[token]/update-client`
  - `/api/invite/[token]/process-update-form`

### Backward Compatibility
- Old `/invite/[token]/update` route redirects to new `/qr-update/[token]`
- Existing QR codes continue to work

## Security

- **Token Validation**: Verifies token matches client
- **Public Access**: No authentication required (by design)
- **Token-Based**: Access controlled via invite token
- **No Account Exposure**: Policyholders don't need accounts

## Use Cases

1. **Corrections**: Fix errors in submitted information
2. **Updates**: Update policy information as it changes
3. **Additions**: Add new policies or beneficiaries
4. **Continuity**: Maintain complete historical record
5. **Legal Defense**: Provide immutable proof of updates

