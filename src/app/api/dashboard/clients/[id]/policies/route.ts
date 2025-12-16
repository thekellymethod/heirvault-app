import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireOrgScope } from "@/lib/authz";

export async function GET(req: Request) {
  const { scopeOrgId } = requireOrgScope();
  const url = new URL(req.url);
  const clientId = url.searchParams.get("clientId");

  const policies = await prisma.policy.findMany({
    where: {
      orgId: scopeOrgId,
      ...(clientId ? { clientId } : {}),
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(policies);
}
