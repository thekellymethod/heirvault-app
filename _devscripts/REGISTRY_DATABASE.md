# Registry-First Database Design

## Overview

The database is designed with a **registry-first** approach, not user-first. This means:

- **Registry records** are the primary entity
- **Nothing ever updates in place** - every change creates a new version row
- All data is **immutable** and **versioned**
- Complete **audit trail** via access logs

## Schema Structure

### Core Tables

#### `registry_records`
Main registry table. Each record represents a single registry entry.

```typescript
{
  id: UUID (primary key)
  decedentName: string
  status: RegistryStatus (ACTIVE | ARCHIVED | PENDING_VERIFICATION | VERIFIED | DISPUTED)
  createdAt: timestamp
}
```

#### `registry_versions`
Immutable versioned data. **Nothing updates in place** - every change creates a new version row.

```typescript
{
  id: UUID (primary key)
  registryId: UUID (foreign key to registry_records)
  dataJson: JSONB (complete registry data snapshot at this version)
  submittedBy: RegistrySubmissionSource (SYSTEM | ATTORNEY | INTAKE)
  hash: string (SHA-256 hash of dataJson for integrity)
  createdAt: timestamp
}
```

#### `documents`
Documents linked to registry versions (not directly to registry records).

```typescript
{
  id: UUID (primary key)
  registryVersionId: UUID (foreign key to registry_versions)
  fileName: string
  filePath: string
  documentHash: string (SHA-256 hash)
  // ... other fields
}
```

#### `access_logs`
Audit trail for registry access. Tracks all actions performed on registries.

```typescript
{
  id: UUID (primary key)
  registryId: UUID (foreign key to registry_records)
  userId: UUID | null (foreign key to users, null for system actions)
  action: AccessLogAction (VIEWED | CREATED | UPDATED | VERIFIED | ARCHIVED | EXPORTED | DELETED)
  timestamp: timestamp
}
```

## Database Functions

All functions are exported from `/lib/db.ts`:

### `createRegistry(input: CreateRegistryInput): Promise<RegistryWithVersions>`

Creates a new registry record with its first version atomically.

**Input:**
```typescript
{
  decedentName: string
  status?: RegistryStatus (default: PENDING_VERIFICATION)
  initialData: Record<string, unknown> // JSON data for first version
  submittedBy: RegistrySubmissionSource
}
```

**Returns:** Complete registry with versions and access logs.

**Rule:** Creates both registry record and first version in a transaction.

### `appendRegistryVersion(input: AppendVersionInput): Promise<RegistryVersion>`

Appends a new version to an existing registry.

**Input:**
```typescript
{
  registryId: string
  data: Record<string, unknown> // JSON data for new version
  submittedBy: RegistrySubmissionSource
}
```

**Returns:** The newly created version.

**Rule:** **Nothing updates in place.** Every change creates a new version row, preserving the historical chain.

### `getRegistryById(registryId: string): Promise<RegistryWithVersions>`

Gets a registry by ID with all versions and access logs.

**Returns:**
```typescript
{
  ...registryRecord
  versions: RegistryVersion[] // Ordered by creation time, newest first
  latestVersion: RegistryVersion | null // Most recent version
  accessLogs: AccessLog[] // Ordered by timestamp, newest first
}
```

### `logAccess(input: LogAccessInput): Promise<AccessLog>`

Logs access to a registry. Creates an audit trail entry.

**Input:**
```typescript
{
  registryId: string
  userId?: string | null // null for system actions
  action: AccessLogAction
}
```

**Returns:** The created access log entry.

**Note:** Called automatically by `createRegistry()` and `appendRegistryVersion()`, but can also be called explicitly for other actions (VIEWED, VERIFIED, etc.).

### `getRegistryVersionById(versionId: string): Promise<RegistryVersionWithDocuments>`

Gets a registry version by ID with associated documents.

**Returns:**
```typescript
{
  ...registryVersion
  documents: Array<{
    id: string
    fileName: string
    filePath: string
    documentHash: string
    createdAt: Date
  }>
}
```

## Typed Return Objects

TypeScript types are defined early to enforce correctness:

```typescript
// Complete registry with versions and logs
type RegistryWithVersions = RegistryRecord & {
  versions: RegistryVersion[];
  latestVersion: RegistryVersion | null;
  accessLogs: AccessLog[];
};

// Registry version with documents
type RegistryVersionWithDocuments = RegistryVersion & {
  documents: Array<{
    id: string,
    fileName: string,
    filePath: string,
    documentHash: string,
    createdAt: Date;
  }>;
};
```

## Key Principles

### 1. Immutability
- **Nothing updates in place**
- Every change creates a new version row
- Historical data is preserved forever

### 2. Registry-First
- Registry records are the primary entity
- Users, documents, and access logs all reference registries
- Not user-first or client-first

### 3. Audit Trail
- Every action is logged in `access_logs`
- Complete history of who did what and when
- System actions have `userId = null`

### 4. Cryptographic Integrity
- Every version has a SHA-256 hash of its data
- Documents have SHA-256 hashes
- Enables verification of data integrity

### 5. Type Safety
- Typed return objects enforce correctness
- TypeScript catches errors at compile time
- Input types ensure valid data

## Usage Examples

### Create a Registry

```typescript
import { createRegistry } from "@/lib/db";

const registry = await createRegistry({
  decedentName: "John Doe",
  status: "PENDING_VERIFICATION",
  initialData: {
    policies: [...],
    beneficiaries: [...],
    clientInfo: {...}
  },
  submittedBy: "INTAKE"
});

// registry.versions[0] contains the first version
// registry.latestVersion is the same as versions[0]
// registry.accessLogs[0] contains the CREATED log
```

### Append a Version

```typescript
import { appendRegistryVersion } from "@/lib/db";

const newVersion = await appendRegistryVersion({
  registryId: registry.id,
  data: {
    // Updated data
    policies: [...],
    beneficiaries: [...],
    clientInfo: {...}
  },
  submittedBy: "ATTORNEY"
});

// A new version row is created
// The old version remains unchanged
// An UPDATED log entry is created automatically
```

### Get Registry with History

```typescript
import { getRegistryById } from "@/lib/db";

const registry = await getRegistryById(registryId);

// registry.versions contains all versions (newest first)
// registry.latestVersion is the most recent version
// registry.accessLogs contains all access logs (newest first)
```

### Log Access

```typescript
import { logAccess } from "@/lib/db";

// Log a view action
await logAccess({
  registryId: registry.id,
  userId: user.id,
  action: "VIEWED"
});

// Log a system action
await logAccess({
  registryId: registry.id,
  userId: null, // System action
  action: "VERIFIED"
});
```

## Migration

Run the migration to create the registry tables:

```bash
# The migration file is at:
# prisma/migrations/20250122000000_add_registry_tables/migration.sql
```

The migration:
1. Creates the `RegistryStatus`, `RegistrySubmissionSource`, and `AccessLogAction` enums
2. Creates `registry_records` table
3. Creates `registry_versions` table
4. Creates `access_logs` table
5. Adds `registry_version_id` column to `documents` table

## Notes

- **Registry-first design**: The registry is the primary entity, not users or clients
- **Immutable versions**: All changes create new versions, preserving history
- **Complete audit trail**: Every action is logged with user, timestamp, and action type
- **Type safety**: Typed return objects ensure correctness at compile time
- **Cryptographic integrity**: SHA-256 hashes enable data verification

