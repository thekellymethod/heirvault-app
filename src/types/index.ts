// Application-level types

export type UserRole = 'attorney' | 'client' | 'admin'
export type InviteStatus = 'pending' | 'accepted' | 'expired' | 'revoked'

export interface User {
  id: string
  email: string
  role: UserRole
  firstName?: string
  lastName?: string
  organizationId?: string
  mfaEnabled: boolean
}

export interface Organization {
  id: string
  name: string
  createdAt: string
  updatedAt: string
}

export interface Client {
  id: string
  email: string
  firstName: string
  lastName: string
  phone?: string
  dateOfBirth?: string
  createdAt: string
  updatedAt: string
}

export interface Insurer {
  id: string
  name: string
  contactPhone?: string
  contactEmail?: string
  website?: string
}

export interface Policy {
  id: string
  clientId: string
  insurerId: string
  insurer?: Insurer
  policyNumber?: string
  policyType?: string
  beneficiaries?: Beneficiary[]
  createdAt: string
  updatedAt: string
}

export interface Beneficiary {
  id: string
  clientId: string
  firstName: string
  lastName: string
  relationship?: string
  email?: string
  phone?: string
  dateOfBirth?: string
  policies?: Policy[]
  createdAt: string
  updatedAt: string
}

export interface AttorneyClientAccess {
  id: string
  attorneyId: string
  clientId: string
  organizationId?: string
  grantedAt: string
  revokedAt?: string
  isActive: boolean
}

export interface Invite {
  id: string
  token: string
  attorneyId: string
  organizationId?: string
  clientEmail: string
  status: InviteStatus
  expiresAt: string
  acceptedAt?: string
  createdAt: string
}

export interface ClientSummary {
  client: Client
  policyCount: number
  beneficiaryCount: number
  hasPolicies: boolean
}

