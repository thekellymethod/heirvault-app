import { prisma } from "@/lib/db";
import { requireAuth } from "@/lib/utils/clerk";
import { RegistryRecordView } from "./_components/RegistryRecordView";
import { redirect } from "next/navigation";

interface Props {
  params: Promise<{ id: string }>;
}

/**
 * Registry Record Detail Page
 * 
 * This page represents a single authoritative policy record.
 * Its function is long-term preservation and controlled disclosure.
 * It shows structured policy data, document hashes, submission history,
 * verification status, and access logs.
 * 
 * This is the page that ultimately answers the question:
 * "Does a policy exist, and where?"
 */
export default async function RegistryRecordPage({ params }: Props) {
  const { id } = await params;
  await requireAuth();

  // Get policy with all related data
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

  // Get all documents
  const documents = await prisma.$queryRawUnsafe<Array<{
    id: string;
    file_name: string;
    file_type: string;
    file_size: number;
    file_path: string;
    document_hash: string;
    verified_at: Date | null;
    created_at: Date;
  }>>(`
    SELECT 
      id, file_name, file_type, file_size, file_path, document_hash,
      verified_at, created_at
    FROM documents
    WHERE policy_id = $1
    ORDER BY created_at DESC
  `, id);

  // Get submission history
  const submissions = await prisma.$queryRawUnsafe<Array<{
    id: string;
    status: string;
    submission_type: string;
    created_at: Date;
    processed_at: Date | null;
  }>>(`
    SELECT 
      id, status, submission_type, created_at, processed_at
    FROM submissions
    WHERE client_id = $1
    ORDER BY created_at DESC
  `, policyData.client_id);

  // Get access logs (audit logs for this policy)
  const accessLogs = await prisma.$queryRawUnsafe<Array<{
    id: string;
    action: string;
    message: string;
    user_id: string | null;
    user_first_name: string | null;
    user_last_name: string | null;
    created_at: Date;
  }>>(`
    SELECT 
      al.id, al.action, al.message, al.user_id, al.created_at,
      u.first_name as user_first_name, u.last_name as user_last_name
    FROM audit_logs al
    LEFT JOIN users u ON u.id = al.user_id
    WHERE al.policy_id = $1 OR al.client_id = $2
    ORDER BY al.created_at DESC
    LIMIT 50
  `, id, policyData.client_id);

  // Get receipts
  const receipts = await prisma.$queryRawUnsafe<Array<{
    id: string;
    receipt_number: string;
    created_at: Date;
  }>>(`
    SELECT 
      id, receipt_number, created_at
    FROM receipts
    WHERE client_id = $1
    ORDER BY created_at DESC
  `, policyData.client_id);

  return (
    <RegistryRecordView
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
        documentHash: d.document_hash,
        verifiedAt: d.verified_at,
        createdAt: d.created_at,
      }))}
      submissions={submissions.map(s => ({
        id: s.id,
        status: s.status,
        submissionType: s.submission_type,
        createdAt: s.created_at,
        processedAt: s.processed_at,
      }))}
      accessLogs={accessLogs.map(a => ({
        id: a.id,
        action: a.action,
        message: a.message,
        userId: a.user_id,
        userName: a.user_first_name && a.user_last_name
          ? `${a.user_first_name} ${a.user_last_name}`
          : null,
        createdAt: a.created_at,
      }))}
      receipts={receipts.map(r => ({
        id: r.id,
        receiptNumber: r.receipt_number,
        createdAt: r.created_at,
      }))}
    />
  );
}

