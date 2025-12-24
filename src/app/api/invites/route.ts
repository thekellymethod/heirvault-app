import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/utils/clerk'
import { createInvite } from '@/lib/utils/invites'
import { sendClientInviteEmail } from '@/lib/email'
import { getCurrentUserWithOrg } from '@/lib/authz'

export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth('attorney')
    const body = await request.json()

    const { clientEmail } = body

    if (!clientEmail) {
      return NextResponse.json({ error: 'Client email is required' }, { status: 400 })
    }

    const organizationId = user.orgMemberships[0]?.organizationId || null

    const invite = await createInvite(
      user.id,
      organizationId,
      clientEmail
    )

    // Send invite email
    try {
      const { orgMember } = await getCurrentUserWithOrg()
      const baseUrl = process.env.NEXT_PUBLIC_APP_URL || request.nextUrl.origin
      const inviteUrl = `${baseUrl}/invite/${invite.token}`
      const firmName = orgMember?.organizations?.name || undefined

      await sendClientInviteEmail({
        to: clientEmail,
        clientName: clientEmail.split('@')[0], // Use email prefix as fallback name
        firmName,
        inviteUrl,
      })
    } catch (emailError: unknown) {
      const emailErrorMessage = emailError instanceof Error ? emailError.message : "Unknown error";
      console.error('Failed to send invite email:', emailError)
      // Continue even if email fails - we still return the invite
    }

    return NextResponse.json(invite, { status: 201 })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: message === 'Unauthorized' || message === 'Forbidden' ? 401 : 400 })
  }
}

