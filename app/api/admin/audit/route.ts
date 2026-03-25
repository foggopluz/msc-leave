import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const adminId = searchParams.get('admin_id')
  const limit = parseInt(searchParams.get('limit') ?? '50')

  const { data: admin } = await db.from('users').select('id').eq('id', adminId).eq('role', 'admin').single()
  if (!admin) return NextResponse.json({ error: 'Unauthorized: admin access required' }, { status: 403 })

  const { data, error } = await db.from('audit_logs')
    .select('*, admin:users!audit_logs_admin_id_fkey(*), target_user:users!audit_logs_target_user_id_fkey(*)')
    .order('created_at', { ascending: false })
    .limit(limit)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data ?? [])
}
