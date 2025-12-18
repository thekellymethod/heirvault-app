import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params
    
    const invite = await prisma.invite.findUnique({
      where: { token },
    })

    if (!invite) {
      return NextResponse.json({ error: 'Invalid invite link' }, { status: 404 })
    }

    return NextResponse.json(invite)
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 400 })
  }
}

