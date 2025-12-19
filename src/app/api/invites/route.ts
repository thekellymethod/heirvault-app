import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/utils/clerk'
import { createInvite } from '@/lib/utils/invites'

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

    // Note: Email sending is handled in /api/clients/invite/route.ts
    // This endpoint is kept for backward compatibility

    return NextResponse.json(invite, { status: 201 })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: error.message === 'Unauthorized' || error.message === 'Forbidden' ? 401 : 400 })
  }
}

