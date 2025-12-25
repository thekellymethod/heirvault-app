# Database Separation and Conflict Prevention

This document explains how the database is structured to ensure proper separation between attorneys and clients, and prevent conflicts when multiple people share the same name, date of birth, or address.

## Data Separation Strategy

### 1. **Client Fingerprinting System**

Each client record has a unique `client_fingerprint` field that is a SHA-256 hash of identifying information:
- Email (primary identifier)
- Name + Date of Birth combination
- SSN last 4 (if available)
- Passport number (if available)
- Driver's license (if available)

This fingerprint ensures that:
- **No duplicate clients** are created when the same person is invited by multiple attorneys
- **Legitimate duplicates** are allowed (e.g., two different people with the same name and DOB but different emails)
- **Automatic deduplication** when creating clients - if a fingerprint match is found, the existing client is reused

### 2. **Unique Constraints**

#### Clients Table
- `email` - Unique constraint prevents duplicate email addresses
- `client_fingerprint` - Unique constraint (when not null) prevents duplicate client records
- `user_id` - Unique constraint (one client can be linked to one user account, if applicable)

#### Composite Indexes for Search
- `(firstName, lastName, dateOfBirth)` - Helps identify potential duplicates by name and DOB
- `(address_line1, city, state, postal_code)` - Helps identify potential duplicates by address
- `client_fingerprint` - Fast lookups for fingerprint matching
- `org_id` - Organization separation

### 3. **Address Fields for Separation**

All entities (clients, beneficiaries, attorneys) now have separate address fields:
- `address_line1`
- `address_line2`
- `city`
- `state`
- `postal_code`
- `country`

This allows:
- **Multiple people at the same address** (e.g., family members)
- **Address-based searches** to identify potential relationships
- **Geographic separation** for attorneys and organizations

### 4. **Attorney-Client Separation**

Attorneys and clients are stored in separate tables:
- **`users` table`** - Stores attorney accounts (authentication via Clerk)
- **`clients` table`** - Stores client information (no accounts, access via invitation links)
- **`attorneyClientAccess` table`** - Links attorneys to clients (many-to-many relationship)

This ensures:
- **No data mixing** between attorney and client records
- **Multiple attorneys** can access the same client
- **Client data** is never tied to authentication accounts

### 5. **Global Access with Proper Separation**

All attorneys can view all clients globally, but:
- Each client has a **unique UUID** as primary key
- Each client has a **unique fingerprint** to prevent duplicates
- Each client can be associated with **multiple organizations** via `attorneyClientAccess`
- **No conflicts** occur because each record is uniquely identified by UUID, not by name/DOB/address

## How It Works

### Client Creation Flow

1. **Generate Fingerprint**: When creating a client, a fingerprint is generated from identifying information
2. **Check for Duplicates**: System checks if a client with the same fingerprint already exists
3. **Reuse or Create**:
   - If duplicate found → Grant attorney access to existing client
   - If no duplicate → Create new client with fingerprint
4. **Store Address**: Address information is stored separately to allow multiple people at same address

### Example Scenarios

#### Scenario 1: Same Name, Different People
- **John Smith, DOB: 1980-01-01, Email: john@example.com** → Fingerprint: `abc123...`
- **John Smith, DOB: 1980-01-01, Email: john.smith@example.com** → Fingerprint: `def456...`
- **Result**: Two separate client records (different emails = different fingerprints)

#### Scenario 2: Same Person, Multiple Attorneys
- **Jane Doe, DOB: 1990-05-15, Email: jane@example.com** → Fingerprint: `xyz789...`
- Attorney A invites → Creates client with fingerprint `xyz789...`
- Attorney B invites same person → Finds existing client with fingerprint `xyz789...`
- **Result**: One client record, both attorneys have access

#### Scenario 3: Same Address, Different People
- **Person A** at `123 Main St, New York, NY 10001`
- **Person B** at `123 Main St, New York, NY 10001`
- **Result**: Two separate client records (different fingerprints), same address stored separately

## Migration

To apply these changes, run:

```bash
# The migration file has been created at:
# prisma/migrations/20250120000000_add_client_fingerprint_and_separation/migration.sql

# Apply the migration
npx prisma migrate deploy
```

## Benefits

1. **No Duplicate Clients**: Fingerprint system prevents accidental duplicates
2. **Proper Separation**: Attorneys and clients are in separate tables
3. **Address Flexibility**: Multiple people can share addresses without conflicts
4. **Name Flexibility**: Multiple people can share names without conflicts
5. **Global Access**: All attorneys can see all clients, but each client is uniquely identified
6. **Data Integrity**: Unique constraints ensure data consistency

