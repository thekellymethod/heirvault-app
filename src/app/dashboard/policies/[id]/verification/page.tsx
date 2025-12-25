import { prisma } from "@/lib/db";
import { requireAuth } from "@/lib/utils/clerk";
import { assertAttorneyCanAccessClient } from "@/lib/authz";
import { DocumentVerificationView } from "./_components/DocumentVerificationView";
import { redirect } from "next/navigation";
import { getOrCreateAppUser } from "@/lib/auth/CurrentUser";
import { hasAdminRole } from "@/lib/auth/admin-bypass";

interface Props {
  params: Promise<{ id: string }>;
}

/**
 * Document Processing & Verification Page (System / Attorney View)
 * 
 * This page displays extracted policy data alongside source documents.
 * Its function is validation and verification. Attorneys can confirm
 * carrier identity, policy status, completeness, and accuracy.
 * 
 * CRITICAL: Verifies attorney has access to the policy's client before
 * displaying any data. This prevents unauthorized access to policy,
 * client, and document information.
 */
export default async function DocumentVerificationPage({ params }: Props) {
  const { id } = await params;
  const { userId } = await requireAuth();

  // First, get only the client_id to verify access
  // This prevents unauthorized access to policy data
  const policyClient = await prisma.$queryRawUnsafe<Array<{
    clientId:string,
  }>>(`
    SELECT client_id
    FROM policies
    WHERE id = $1
    LIMIT 1
  `, id);

  if (!policyClient || policyClient.length === 0) {
    redirect("/dashboard/policies");
  }

  const clientId = policyClient[0].client_id;

  // CRITICAL: Verify attorney has access to this client before proceeding
  // This prevents any authenticated user from accessing any policy's data
  try {
    await assertAttorneyCanAccessClient(clientId);
  } catch {
    // Access denied - redirect to policies list
    redirect("/dashboard/policies");
  }

  // Now that access is verified, fetch the full policy data
  const policy = await prisma.$queryRawUnsafe<Array<{
    id: string,
    policy_number: string | null;
    policy_type: string | null;
    verification_status: string,
    verified_at: Date | null;
    verified_by_user_id: string | null;
    verification_notes: string | null;
    document_hash: string | null;
    createdAt: Date;
    updated_at: Date;
    clientId:string,
    insurer_id: string | null;
    carrier_name_raw: string | null;
    insurer_name: string | null;
    client_firstName: string,
    client_lastName: string,
    client_email: string,
  }>>(`
    SELECT 
      p.id,
      p.policy_number,
      p.policy_type,
      p.verification_status,
      p.verified_at,
      p.verified_by_user_id,
      p.verification_notes,
      p.document_hash,
      p.createdAt,
      p.updated_at,
      p.client_id,
      p.insurer_id,
      p.carrier_name_raw,
      i.name as insurer_name,
      c.firstName as client_firstName,
      c.lastName as client_lastName,
      c.email as client_email
    FROM policies p
    LEFT JOIN insurers i ON i.id = p.insurer_id
    INNER JOIN clients c ON c.id = p.client_id
    WHERE p.id = $1
    LIMIT 1
  `, id);

  if (!policy || policy.length === 0) {
    redirect("/dashboard/policies");
  }

  const policyData = policy[0];

  // Check if current user is admin
  let isAdmin = false;
  try {
    const appUser = await getOrCreateAppUser();
    isAdmin = appUser ? hasAdminRole(appUser) : false;
  } catch {
    // If admin check fails, default to false
    isAdmin = false;
  }

  // Get documents for this policy
  const documents = await prisma.$queryRawUnsafe<Array<{
    id: string,
    file_name: string,
    file_type: string,
    file_size: number;
    file_path: string,
    mime_type: string,
    extracted_data: unknown;
    ocr_confidence: number | null;
    document_hash: string,
    verified_at: Date | null;
    verified_by_user_id: string | null;
    verification_notes: string | null;
    createdAt: Date;
  }>>(`
    SELECT 
      id, file_name, file_type, file_size, file_path, mime_type,
      extracted_data, ocr_confidence, document_hash,
      verified_at, verified_by_user_id, verification_notes, createdAt
    FROM documents
    WHERE policy_id = $1
    ORDER BY createdAt DESC
  `, id);

  // Get submission history
  const submissions = await prisma.$queryRawUnsafe<Array<{
    id: string,
    status: string,
    submission_type: string,
    submitted_data: unknown;
    createdAt: Date;
    processed_at: Date | null;
  }>>(`
    SELECT 
      id, status, submission_type, submitted_data, createdAt, processed_at
    FROM submissions
    WHERE client_id = $1
    ORDER BY createdAt DESC
    LIMIT 10
  `, policyData.client_id);

  return (
    <DocumentVerificationView
      policy={{
        id: policyData.id,
        policyNumber: policyData.policy_number,
        policyType: policyData.policy_type,
        verificationStatus: policyData.verification_status as "PENDING" | "VERIFIED" | "DISCREPANCY" | "INCOMPLETE" | "REJECTED",
        verifiedAt: policyData.verified_at,
        verifiedByUserId: policyData.verified_by_user_id,
        verificationNotes: policyData.verification_notes,
        documentHash: policyData.document_hash,
        createdAt: policyData.createdAt,
        updatedAt: policyData.updated_at,
        client: {
          id: policyData.client_id,
          firstName: policyData.client_firstName,
          lastName: policyData.client_lastName,
          email: policyData.client_email,
        },
        insurer: policyData.insurer_id ? {
          id: policyData.insurer_id,
          name: policyData.insurer_name || "Unknown",
        } : null,
        carrierNameRaw: policyData.carrier_name_raw,
      }}
      documents={documents.map((d: typeof documents[0]) => ({
        id: d.id,
        fileName: d.file_name,
        fileType: d.file_type,
        fileSize: d.file_size,
        filePath: d.file_path,
        mimeType: d.mime_type,
        extractedData: d.extracted_data,
        ocrConfidence: d.ocr_confidence,
        documentHash: d.document_hash,
        verifiedAt: d.verified_at,
        verifiedByUserId: d.verified_by_user_id,
        verificationNotes: d.verification_notes,
        createdAt: d.createdAt,
      }))}
      submissions={submissions.map((s: typeof submissions[0]) => ({
        id: s.id,
        status: s.status,
        submissionType: s.submission_type,
        submittedData: s.submitted_data,
        createdAt: s.createdAt,
        processedAt: s.processed_at,
      }))}
      currentUserId={userId}
      isAdmin={isAdmin}
    />
  );
}

