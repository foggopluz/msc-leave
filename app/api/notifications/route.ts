import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const userId = searchParams.get('user_id')
  if (!userId) return NextResponse.json({ error: 'user_id required' }, { status: 400 })

  const { data, error } = await db.from('notifications')
    .select('*').eq('user_id', userId).order('created_at', { ascending: false })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data ?? [])
}

export async function PATCH(req: NextRequest) {
  const { user_id, id } = await req.json()
  if (id) {
    await db.from('notifications').update({ read: true }).eq('id', id)
  } else if (user_id) {
    await db.from('notifications').update({ read: true }).eq('user_id', user_id)
  }
  return NextResponse.json({ success: true })
}
