import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/utils/clerk'
import { acceptInvite } from '@/lib/utils/invites'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params
    const user = await getCurrentUser()
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const client = await acceptInvite(token, user.id)

    return NextResponse.json(client, { status: 200 })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 400 })
  }
}

