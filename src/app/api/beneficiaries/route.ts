import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAuth } from "@/lib/utils/clerk";
import { logAuditEvent } from "@/lib/audit";

export async function GET(req: NextRequest) {
  try {
    const user = await requireAuth("attorney");

    // Get ALL beneficiaries globally - all attorneys can see all beneficiaries
    // Use raw SQL first for reliability
    let beneficiaries: any[] = [];
    try {
      const rawResult = await prisma.$queryRaw<Array<{
        id: string;
        client_id: string;
        first_name: string;
        last_name: string;
        relationship: string | null;
        email: string | null;
        phone: string | null;
        date_of_birth: Date | null;
        created_at: Date;
        updated_at: Date;
        client_first_name: string;
        client_last_name: string;
        client_email: string;
      }>>`
        SELECT 
          b.id,
          b.client_id,
          b.first_name,
          b.last_name,
          b.relationship,
          b.email,
          b.phone,
          b.date_of_birth,
          b.created_at,
          b.updated_at,
          c.first_name as client_first_name,
          c.last_name as client_last_name,
          c.email as client_email
        FROM beneficiaries b
        INNER JOIN clients c ON c.id = b.client_id
        ORDER BY b.created_at DESC
      `;

      // Group beneficiaries and get their policies
      const beneficiaryMap = new Map<string, any>();
      for (const row of rawResult) {
        if (!beneficiaryMap.has(row.id)) {
          beneficiaryMap.set(row.id, {
            id: row.id,
            firstName: row.first_name,
            lastName: row.last_name,
            relationship: row.relationship,
            email: row.email,
            phone: row.phone,
            dateOfBirth: row.date_of_birth,
            client: {
              id: row.client_id,
              firstName: row.client_first_name,
              lastName: row.client_last_name,
              email: row.client_email,
            },
            policies: [],
          });
        }
      }

      // Get policies for each beneficiary
      const beneficiaryIds = Array.from(beneficiaryMap.keys());
      if (beneficiaryIds.length > 0) {
        // Query policies for all beneficiaries at once
        const policiesResult = await prisma.$queryRawUnsafe<Array<{
          beneficiary_id: string;
          policy_id: string;
          policy_number: string | null;
          policy_type: string | null;
          insurer_name: string;
        }>>(
          `SELECT 
            pb.beneficiary_id,
            p.id as policy_id,
            p.policy_number,
            p.policy_type,
            i.name as insurer_name
          FROM policy_beneficiaries pb
          INNER JOIN policies p ON p.id = pb.policy_id
          INNER JOIN insurers i ON i.id = p.insurer_id
          WHERE pb.beneficiary_id = ANY($1::text[])`,
          beneficiaryIds
        );

        for (const policyRow of policiesResult) {
          const beneficiary = beneficiaryMap.get(policyRow.beneficiary_id);
          if (beneficiary) {
            beneficiary.policies.push({
              id: policyRow.policy_id,
              policyNumber: policyRow.policy_number,
              policyType: policyRow.policy_type,
              insurer: {
                name: policyRow.insurer_name,
              },
            });
          }
        }
      }

      beneficiaries = Array.from(beneficiaryMap.values());
    } catch (sqlError: any) {
      console.error("Beneficiaries list: Raw SQL failed, trying Prisma:", sqlError.message);
      // Fallback to Prisma
      try {
        beneficiaries = await prisma.beneficiary.findMany({
          include: {
            client: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true,
              },
            },
          },
          orderBy: {
            createdAt: "desc",
          },
        });
      } catch (prismaError: any) {
        console.error("Beneficiaries list: Prisma also failed:", prismaError.message);
        throw prismaError;
      }
    }

    return NextResponse.json(beneficiaries);
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Unable to fetch beneficiaries" },
      { status: error.message === "Unauthorized" || error.message === "Forbidden" ? 401 : 400 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await requireAuth("attorney");
    const body = await req.json();

    const {
      clientId,
      firstName,
      lastName,
      relationship,
      email,
      phone,
      dateOfBirth,
    } = body;

    if (!clientId || !firstName || !lastName) {
      return NextResponse.json(
        { error: "Missing required fields: clientId, firstName, and lastName are required" },
        { status: 400 }
      );
    }

    // All attorneys can create beneficiaries for any client (global access)
    // Just verify the client exists
    const clientExists = await prisma.client.findUnique({
      where: { id: clientId },
      select: { id: true },
    });

    if (!clientExists) {
      return NextResponse.json({ error: "Client not found" }, { status: 404 });
    }

    const beneficiary = await prisma.beneficiary.create({
      data: {
        clientId,
        firstName,
        lastName,
        relationship: relationship || null,
        email: email ?? null,
        phone: phone ?? null,
        dateOfBirth: dateOfBirth ? new Date(dateOfBirth) : null,
      },
    });

    await logAuditEvent({
      action: "BENEFICIARY_CREATED",
      message: "Beneficiary created",
      userId: user.id,
      clientId,
    });

    return NextResponse.json(beneficiary, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: "Unable to create beneficiary" },
      { status: 400 }
    );
  }
}
