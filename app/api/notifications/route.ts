import { NextRequest, NextResponse } from 'next/server'
import { notifications } from '@/lib/store'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const userId = searchParams.get('user_id')

  if (!userId) return NextResponse.json({ error: 'user_id required' }, { status: 400 })

  const userNotifs = notifications
    .filter(n => n.user_id === userId)
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())

  return NextResponse.json(userNotifs)
}

export async function PATCH(req: NextRequest) {
  const { user_id, id } = await req.json()

  if (id) {
    // Mark single notification read
    const n = notifications.find(n => n.id === id)
    if (n) n.read = true
  } else if (user_id) {
    // Mark all read for user
    notifications.filter(n => n.user_id === user_id).forEach(n => (n.read = true))
  }

  return NextResponse.json({ success: true })
}
