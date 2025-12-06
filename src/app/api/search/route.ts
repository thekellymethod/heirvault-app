import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUserWithOrg } from "@/lib/authz";

export async function GET(req: Request) {
  const { user, orgMember } = await getCurrentUserWithOrg();

  if (!user || !orgMember) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const q = (searchParams.get("q") || "").trim();

  if (!q) {
    return NextResponse.json({ clients: [], policies: [] });
  }

  // Basic LIKE search; you can later switch to full-text index
  const clients = await prisma.client.findMany({
    where: {
      orgId: orgMember.organizationId,
      OR: [
        { firstName: { contains: q, mode: "insensitive" } },
        { lastName: { contains: q, mode: "insensitive" } },
        { email: { contains: q, mode: "insensitive" } },
        { phone: { contains: q, mode: "insensitive" } },
      ],
    },
    take: 10,
  });

  const policies = await prisma.policy.findMany({
    where: {
      client: { orgId: orgMember.organizationId },
      OR: [
        { insurer: { name: { contains: q, mode: "insensitive" } } },
        { policyNumber: { contains: q, mode: "insensitive" } },
        { employerName: { contains: q, mode: "insensitive" } },
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

  return NextResponse.json({
    clients,
    policies: policies.map((p) => ({
      id: p.id,
      insurerName: p.insurer.name,
      policyNumber: p.policyNumber,
      client: {
        id: p.client.id,
        firstName: p.client.firstName,
        lastName: p.client.lastName,
      },
    })),
  });
}

