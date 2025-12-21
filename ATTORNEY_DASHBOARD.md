# Attorney Dashboard

## Overview

The Attorney Dashboard is the operational control center for attorneys. It provides a real-time overview of all registries, estates, and policy records that attorneys are authorized to access.

## Function

**Operational Control Center**: Gives attorneys a comprehensive view of all policy records with key metadata, enabling quick access to records, verification management, and confirmation generation.

## Key Features

### 1. **Real-Time Overview**
- Displays all policy records attorneys are authorized to access
- Updates in real-time as records are modified
- Shows key metadata without exposing unnecessary document detail

### 2. **Key Metadata Display**
- **Decedent Name**: Client/policyholder name
- **Status**: Verification status (PENDING, VERIFIED, DISCREPANCY, INCOMPLETE, REJECTED)
- **Carrier Verification State**: Current verification status with visual indicators
- **Last Update Timestamp**: When the record was last modified
- **Policy Number**: Policy identifier
- **Policy Type**: Type of life insurance policy
- **Carrier/Insurer**: Insurance company name
- **Document Count**: Number of associated documents

### 3. **Summary Statistics**
- Total Policies
- Verified Policies
- Pending Verification
- Discrepancies
- Total Clients

### 4. **Search and Filter**
- Search by client name, email, policy number, or carrier
- Filter by verification status
- Real-time filtering as you type

### 5. **Quick Actions**
- **View Record**: Open registry record detail page
- **Verify**: Access verification page for pending policies
- **Search**: Access policy locator
- **Manage Clients**: View all client records
- **Compliance**: Access compliance tools

## Route

**`/dashboard`**

Requires authentication (attorney-only).

## API Endpoint

**`GET /api/dashboard/policies`**

Returns all policies with key metadata for the dashboard.

## Integration Points

### From Dashboard, Attorneys Can:

1. **Initiate Searches**
   - Click "Search" button → Policy Locator
   - Use search bar to filter policies

2. **Open Records**
   - Click "View" → Registry Record Detail Page
   - See complete authoritative record

3. **Manage Verifications**
   - Click "Verify" on pending policies → Verification Page
   - Update verification status and notes

4. **Generate Confirmations**
   - Access receipts from registry record pages
   - Generate confirmations for verified policies

## Visual Indicators

### Verification Status Colors

- **VERIFIED**: Green (✓ CheckCircle)
- **PENDING**: Gray (Clock)
- **DISCREPANCY**: Amber (⚠ AlertCircle)
- **INCOMPLETE**: Blue (Clock)
- **REJECTED**: Red (AlertCircle)

## Data Privacy

- **No Document Detail**: Dashboard shows metadata only, not document contents
- **Key Information Only**: Essential information for quick decision-making
- **Full Details on Demand**: Click through to detailed pages for complete information

## Performance

- Limits to 100 most recent policies
- Efficient queries with proper indexing
- Real-time updates without full page reloads

## Related Pages

- **Registry Record Detail** (`/dashboard/policies/[id]/registry`) - Full authoritative record
- **Verification Page** (`/dashboard/policies/[id]/verification`) - Document verification
- **Policy Locator** (`/dashboard/policy-locator`) - Advanced search
- **Clients Page** (`/dashboard/clients`) - Client management

