import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { sendEmail } from "@/lib/email";
import { getOrCreateTestInvite } from "@/lib/test-invites";

// Simple in-memory store for confirmation codes (in production, use Redis or database)
// Export this so other routes can access it
export const confirmationCodes = new Map<string, { code: string; expiresAt: number; method: string }>();

function generateConfirmationCode(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params;
    const { method } = await req.json();

    if (!method || !["email", "phone"].includes(method)) {
      return NextResponse.json(
        { error: "Invalid confirmation method" },
        { status: 400 }
      );
    }

    // Try to get or create test invite first
    let invite = await getOrCreateTestInvite(token);

    // If not a test code, do normal lookup
    if (!invite) {
      invite = await prisma.client_invites.findUnique({
        where: { token },
        include: { clients: true },
      });
    }

    if (!invite) {
      return NextResponse.json(
        { error: "Invalid token" },
        { status: 404 }
      );
    }

    const code = generateConfirmationCode();
    const expiresAt = Date.now() + 15 * 60 * 1000; // 15 minutes

    confirmationCodes.set(token, { code, expiresAt, method });

    if (method === "email") {
      if (!invite.clients.email) {
        return NextResponse.json(
          { error: "No email address on file. Please contact customer service." },
          { status: 400 }
        );
      }

      await sendEmail({
        to: invite.clients.email,
        subject: "HeirVault - Confirmation Code",
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #111C33; margin-bottom: 20px;">Confirmation Code</h2>
            <p style="color: #253246; line-height: 1.6;">
              You requested to update your HeirVault information. Use the code below to confirm your changes:
            </p>
            <div style="background: #F7F9FC; border: 2px solid #C8942D; border-radius: 8px; padding: 20px; text-align: center; margin: 20px 0;">
              <p style="font-size: 32px; font-weight: 700; color: #111C33; letter-spacing: 4px; margin: 0;">
                ${code}
              </p>
            </div>
            <p style="color: #6B7280; font-size: 12px; margin-top: 20px;">
              This code will expire in 15 minutes. If you did not request this code, please ignore this email.
            </p>
          </div>
        `,
      });
    } else {
      // Phone confirmation via SMS (would integrate with Twilio or similar)
      // For now, return the code (in production, send via SMS)
      console.log(`SMS confirmation code for ${invite.clients.phone}: ${code}`);
      // In production: await sendSMS(invite.client.phone, `Your HeirVault confirmation code is: ${code}`);
    }

    return NextResponse.json({
      success: true,
      message: `Confirmation code sent to your ${method}`,
    });
  } catch (error: unknown) {
    console.error("Error sending confirmation:", error);
    return NextResponse.json(
      { error: "Failed to send confirmation code" },
      { status: 500 }
    );
  }
}

// Export function to verify codes
export function verifyConfirmationCode(token: string, code: string, method: string): boolean {
  const stored = confirmationCodes.get(token);
  if (!stored) return false;
  if (stored.expiresAt < Date.now()) {
    confirmationCodes.delete(token);
    return false;
  }
  if (stored.method !== method) return false;
  return stored.code === code;
}
