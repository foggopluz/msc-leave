import { NextRequest, NextResponse } from 'next/server'
import { leaveBalances } from '@/lib/store'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const userId = searchParams.get('user_id')

  if (!userId) {
    return NextResponse.json({ error: 'user_id is required' }, { status: 400 })
  }

  const balances = leaveBalances.filter(b => b.user_id === userId)
  return NextResponse.json(balances)
}

export async function PATCH(req: NextRequest) {
  const { user_id, leave_type, balance } = await req.json()

  if (!user_id || !leave_type || balance === undefined) {
    return NextResponse.json(
      { error: 'user_id, leave_type, and balance are required' },
      { status: 400 }
    )
  }

  const bal = leaveBalances.find(b => b.user_id === user_id && b.leave_type === leave_type)
  if (!bal) return NextResponse.json({ error: 'Balance not found' }, { status: 404 })

  bal.balance = Math.max(0, balance)
  return NextResponse.json(bal)
}
