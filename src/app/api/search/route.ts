import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUserWithOrg } from "@/lib/authz";

export async function GET(req: Request) {
  const { user } = await getCurrentUserWithOrg();

  if (!user) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const q = (searchParams.get("q") || "").trim();

  if (!q) {
    return NextResponse.json({ clients: [], policies: [] });
  }

  // Global search - search across ALL organizations and ALL clients
  // Use raw SQL first for reliability
  let clients: any[] = [];
  let policies: any[] = [];
  
  try {
    const searchPattern = `%${q.replace(/'/g, "''")}%`;
    
    // Search clients using raw SQL
    const clientsResult = await prisma.$queryRaw<Array<{
      id: string;
      first_name: string;
      last_name: string;
      email: string;
      phone: string | null;
    }>>`
      SELECT 
        c.id,
        c.first_name,
        c.last_name,
        c.email,
        c.phone
      FROM clients c
      WHERE 
        LOWER(c.first_name) LIKE LOWER(${searchPattern}) OR
        LOWER(c.last_name) LIKE LOWER(${searchPattern}) OR
        LOWER(c.email) LIKE LOWER(${searchPattern}) OR
        (c.phone IS NOT NULL AND LOWER(c.phone) LIKE LOWER(${searchPattern}))
      ORDER BY c.created_at DESC
      LIMIT 10
    `;

    clients = clientsResult.map(row => ({
      id: row.id,
      firstName: row.first_name,
      lastName: row.last_name,
      email: row.email,
      phone: row.phone,
    }));

    // Search policies using raw SQL
    const policiesResult = await prisma.$queryRaw<Array<{
      policy_id: string;
      policy_number: string | null;
      insurer_name: string;
      client_id: string;
      client_first_name: string;
      client_last_name: string;
    }>>`
      SELECT 
        p.id as policy_id,
        p.policy_number,
        i.name as insurer_name,
        c.id as client_id,
        c.first_name as client_first_name,
        c.last_name as client_last_name
      FROM policies p
      INNER JOIN clients c ON c.id = p.client_id
      INNER JOIN insurers i ON i.id = p.insurer_id
      WHERE 
        LOWER(i.name) LIKE LOWER(${searchPattern}) OR
        (p.policy_number IS NOT NULL AND LOWER(p.policy_number) LIKE LOWER(${searchPattern}))
      ORDER BY p.created_at DESC
      LIMIT 10
    `;

    policies = policiesResult.map(row => ({
      id: row.policy_id,
      insurerName: row.insurer_name,
      policyNumber: row.policy_number,
      client: {
        id: row.client_id,
        firstName: row.client_first_name,
        lastName: row.client_last_name,
      },
    }));
  } catch (sqlError: any) {
    console.error("Search: Raw SQL failed, trying Prisma:", sqlError.message);
    // Fallback to Prisma
    try {
      clients = await prisma.client.findMany({
        where: {
          OR: [
            { firstName: { contains: q, mode: "insensitive" } },
            { lastName: { contains: q, mode: "insensitive" } },
            { email: { contains: q, mode: "insensitive" } },
            { phone: { contains: q, mode: "insensitive" } },
          ],
        },
        take: 10,
      });

      policies = await prisma.policy.findMany({
        where: {
          OR: [
            { insurer: { name: { contains: q, mode: "insensitive" } } },
            { policyNumber: { contains: q, mode: "insensitive" } },
          ],
        },
        include: {
          client: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
            },
          },
          insurer: {
            select: {
              name: true,
            },
          },
        },
        take: 10,
      });

      policies = policies.map((p) => ({
        id: p.id,
        insurerName: p.insurer.name,
        policyNumber: p.policyNumber,
        client: {
          id: p.client.id,
          firstName: p.client.firstName,
          lastName: p.client.lastName,
        },
      }));
    } catch (prismaError: any) {
      console.error("Search: Prisma also failed:", prismaError.message);
      // Return empty results if both fail
      clients = [];
      policies = [];
    }
  }

  return NextResponse.json({ clients, policies });
}

