import { NextRequest, NextResponse } from 'next/server'
import { auditLogs, users } from '@/lib/store'

// GET /api/admin/audit : fetch audit log (admin only)
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const adminId = searchParams.get('admin_id')
  const limit = parseInt(searchParams.get('limit') ?? '50')

  const admin = users.find(u => u.id === adminId && u.role === 'admin')
  if (!admin) {
    return NextResponse.json({ error: 'Unauthorized: admin access required' }, { status: 403 })
  }

  const enriched = auditLogs.slice(0, limit).map(log => ({
    ...log,
    admin: users.find(u => u.id === log.admin_id),
    target_user: log.target_user_id ? users.find(u => u.id === log.target_user_id) : null,
  }))

  return NextResponse.json(enriched)
}
