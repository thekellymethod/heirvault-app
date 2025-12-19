import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAuth } from "@/lib/utils/clerk";

export async function GET(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireAuth("attorney");
    const { id: clientId } = await ctx.params;

    // Use raw SQL first for reliability
    let policies: any[] = [];
    try {
      // Check if client exists
      const clientExists = await prisma.$queryRaw<Array<{ id: string }>>`
        SELECT id FROM clients WHERE id = ${clientId} LIMIT 1
      `;
      if (!clientExists || clientExists.length === 0) {
        return NextResponse.json({ error: "Client not found" }, { status: 404 });
      }

      // Get policies with beneficiaries
      const rawPolicies = await prisma.$queryRaw<Array<{
        policy_id: string;
        policy_number: string | null;
        policy_type: string | null;
        policy_created_at: Date;
        insurer_id: string;
        insurer_name: string;
        insurer_website: string | null;
        beneficiary_id: string | null;
        beneficiary_first_name: string | null;
        beneficiary_last_name: string | null;
        beneficiary_relationship: string | null;
        beneficiary_email: string | null;
        beneficiary_phone: string | null;
        beneficiary_date_of_birth: Date | null;
      }>>`
        SELECT 
          p.id as policy_id,
          p.policy_number,
          p.policy_type,
          p.created_at as policy_created_at,
          i.id as insurer_id,
          i.name as insurer_name,
          i.website as insurer_website,
          b.id as beneficiary_id,
          b.first_name as beneficiary_first_name,
          b.last_name as beneficiary_last_name,
          b.relationship as beneficiary_relationship,
          b.email as beneficiary_email,
          b.phone as beneficiary_phone,
          b.date_of_birth as beneficiary_date_of_birth
        FROM policies p
        INNER JOIN insurers i ON i.id = p.insurer_id
        LEFT JOIN policy_beneficiaries pb ON pb.policy_id = p.id
        LEFT JOIN beneficiaries b ON b.id = pb.beneficiary_id
        WHERE p.client_id = ${clientId}
        ORDER BY p.created_at DESC, b.first_name ASC, b.last_name ASC
      `;

      // Group by policy
      const policyMap = new Map<string, any>();
      for (const row of rawPolicies) {
        if (!policyMap.has(row.policy_id)) {
          policyMap.set(row.policy_id, {
            id: row.policy_id,
            policyNumber: row.policy_number,
            policyType: row.policy_type,
            createdAt: row.policy_created_at,
            insurer: {
              id: row.insurer_id,
              name: row.insurer_name,
              website: row.insurer_website,
            },
            beneficiaries: [],
          });
        }
        
        if (row.beneficiary_id) {
          const policy = policyMap.get(row.policy_id)!;
          policy.beneficiaries.push({
            id: row.beneficiary_id,
            firstName: row.beneficiary_first_name,
            lastName: row.beneficiary_last_name,
            relationship: row.beneficiary_relationship,
            email: row.beneficiary_email,
            phone: row.beneficiary_phone,
            dateOfBirth: row.beneficiary_date_of_birth,
          });
        }
      }

      policies = Array.from(policyMap.values());
    } catch (sqlError: any) {
      console.error("Client policies GET: Raw SQL failed, trying Prisma:", sqlError.message);
      // Fallback to Prisma
      try {
        const clientExists = await prisma.client.findUnique({
          where: { id: clientId },
          select: { id: true },
        });
        if (!clientExists) return NextResponse.json({ error: "Client not found" }, { status: 404 });

        const prismaPolicies = await prisma.policy.findMany({
          where: { clientId },
          orderBy: { createdAt: "desc" },
          select: {
            id: true,
            policyNumber: true,
            policyType: true,
            createdAt: true,
            insurer: { select: { id: true, name: true, website: true } },
            beneficiaries: { select: { id: true } },
          },
        });

        policies = prismaPolicies.map((p) => ({
          id: p.id,
          policyNumber: p.policyNumber,
          policyType: p.policyType,
          createdAt: p.createdAt,
          insurer: p.insurer,
          beneficiaryCount: p.beneficiaries.length,
          beneficiaries: [],
        }));
      } catch (prismaError: any) {
        console.error("Client policies GET: Prisma also failed:", prismaError.message);
        throw prismaError;
      }
    }

    return NextResponse.json({ policies });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    const status = message === "Unauthorized" ? 401 : 400;
    return NextResponse.json({ error: message }, { status });
  }
}

export async function POST(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireAuth("attorney");
    const { id: clientId } = await ctx.params;

    // All attorneys have global access - just verify client exists
    const clientExists = await prisma.client.findUnique({
      where: { id: clientId },
      select: { id: true },
    });
    if (!clientExists) return NextResponse.json({ error: "Client not found" }, { status: 404 });

    const body = await req.json();
    const insurerId = body?.insurerId as string | undefined;
    const policyNumber = (body?.policyNumber as string | undefined) ?? null;
    const policyType = (body?.policyType as string | undefined) ?? null;

    if (!insurerId) {
      return NextResponse.json({ error: "insurerId is required" }, { status: 400 });
    }

    const policy = await prisma.policy.create({
      data: {
        clientId,
        insurerId,
        policyNumber,
        policyType,
      },
      select: {
        id: true,
        clientId: true,
        insurer: { select: { id: true, name: true } },
        policyNumber: true,
        policyType: true,
        createdAt: true,
      },
    });

    return NextResponse.json({ policy }, { status: 201 });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    const status = message === "Unauthorized" ? 401 : 400;
    return NextResponse.json({ error: message }, { status });
  }
}
