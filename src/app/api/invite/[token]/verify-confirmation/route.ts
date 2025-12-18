import { NextRequest, NextResponse } from "next/server";
import { verifyConfirmationCode } from "../send-confirmation/route";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params;
    const { code, method } = await req.json();

    if (!code || !method) {
      return NextResponse.json(
        { error: "Code and method are required" },
        { status: 400 }
      );
    }

    const isValid = verifyConfirmationCode(token, code, method);

    if (!isValid) {
      return NextResponse.json(
        { error: "Invalid or expired confirmation code" },
        { status: 400 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Error verifying confirmation:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

