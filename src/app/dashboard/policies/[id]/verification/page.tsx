import { prisma } from "@/lib/db";
import { requireAuth } from "@/lib/utils/clerk";
import { DocumentVerificationView } from "./_components/DocumentVerificationView";
import { redirect } from "next/navigation";

interface Props {
  params: Promise<{ id: string }>;
}

/**
 * Document Processing & Verification Page (System / Attorney View)
 * 
 * This page displays extracted policy data alongside source documents.
 * Its function is validation and verification. Attorneys can confirm
 * carrier identity, policy status, completeness, and accuracy.
 */
export default async function DocumentVerificationPage({ params }: Props) {
  const { id } = await params;
  const { userId } = await requireAuth();

  // Get policy with related data
  const policy = await prisma.$queryRawUnsafe<Array<{
    id: string;
    policy_number: string | null;
    policy_type: string | null;
    verification_status: string;
    verified_at: Date | null;
    verified_by_user_id: string | null;
    verification_notes: string | null;
    document_hash: string | null;
    created_at: Date;
    updated_at: Date;
    client_id: string;
    insurer_id: string;
    insurer_name: string;
    client_first_name: string;
    client_last_name: string;
    client_email: string;
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
      p.created_at,
      p.updated_at,
      p.client_id,
      p.insurer_id,
      i.name as insurer_name,
      c.first_name as client_first_name,
      c.last_name as client_last_name,
      c.email as client_email
    FROM policies p
    INNER JOIN insurers i ON i.id = p.insurer_id
    INNER JOIN clients c ON c.id = p.client_id
    WHERE p.id = $1
    LIMIT 1
  `, id);

  if (!policy || policy.length === 0) {
    redirect("/dashboard/policies");
  }

  const policyData = policy[0];

  // Get documents for this policy
  const documents = await prisma.$queryRawUnsafe<Array<{
    id: string;
    file_name: string;
    file_type: string;
    file_size: number;
    file_path: string;
    mime_type: string;
    extracted_data: any;
    ocr_confidence: number | null;
    document_hash: string;
    verified_at: Date | null;
    verified_by_user_id: string | null;
    verification_notes: string | null;
    created_at: Date;
  }>>(`
    SELECT 
      id, file_name, file_type, file_size, file_path, mime_type,
      extracted_data, ocr_confidence, document_hash,
      verified_at, verified_by_user_id, verification_notes, created_at
    FROM documents
    WHERE policy_id = $1
    ORDER BY created_at DESC
  `, id);

  // Get submission history
  const submissions = await prisma.$queryRawUnsafe<Array<{
    id: string;
    status: string;
    submission_type: string;
    submitted_data: any;
    created_at: Date;
    processed_at: Date | null;
  }>>(`
    SELECT 
      id, status, submission_type, submitted_data, created_at, processed_at
    FROM submissions
    WHERE client_id = $1
    ORDER BY created_at DESC
    LIMIT 10
  `, policyData.client_id);

  return (
    <DocumentVerificationView
      policy={{
        id: policyData.id,
        policyNumber: policyData.policy_number,
        policyType: policyData.policy_type,
        verificationStatus: policyData.verification_status as any,
        verifiedAt: policyData.verified_at,
        verifiedByUserId: policyData.verified_by_user_id,
        verificationNotes: policyData.verification_notes,
        documentHash: policyData.document_hash,
        createdAt: policyData.created_at,
        updatedAt: policyData.updated_at,
        client: {
          id: policyData.client_id,
          firstName: policyData.client_first_name,
          lastName: policyData.client_last_name,
          email: policyData.client_email,
        },
        insurer: {
          id: policyData.insurer_id,
          name: policyData.insurer_name,
        },
      }}
      documents={documents.map(d => ({
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
        createdAt: d.created_at,
      }))}
      submissions={submissions.map(s => ({
        id: s.id,
        status: s.status,
        submissionType: s.submission_type,
        submittedData: s.submitted_data,
        createdAt: s.created_at,
        processedAt: s.processed_at,
      }))}
      currentUserId={userId}
    />
  );
}

