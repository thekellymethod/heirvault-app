import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

// Clients don't have accounts - they access via invitation links
// This endpoint is disabled - clients should use /invite/[token] routes instead
export async function GET() {
  return NextResponse.json(
    { error: "Client accounts are not available. Please use your invitation link to access your information." },
    { status: 403 }
  );

    const insurers = await prisma.insurer.findMany({
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    });

    return NextResponse.json({ insurers }, { status: 200 });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "An unknown error occurred";
    return NextResponse.json(
      { error: message },
      { status: message === "Unauthorized" || message === "Forbidden" ? 401 : 400 }
    );
  }
}
