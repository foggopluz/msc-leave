import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const body = await req.json()
  const { admin_id, ...updates } = body

  const { data: admin } = await db.from('users').select('id').eq('id', admin_id).eq('role', 'admin').single()
  if (!admin) return NextResponse.json({ error: 'Unauthorized: admin access required' }, { status: 403 })

  const { data: user } = await db.from('users').select('*').eq('id', id).single()
  if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 })

  const allowed = ['full_name', 'email', 'department_id', 'role', 'is_active', 'joining_date']
  const patch: Record<string, unknown> = {}
  const changed: string[] = []
  for (const key of allowed) {
    if (key in updates && updates[key] !== undefined) {
      if ((user as any)[key] !== updates[key]) changed.push(`${key}: ${(user as any)[key]} -> ${updates[key]}`)
      patch[key] = updates[key]
    }
  }

  const { data: updated, error } = await db.from('users').update(patch).eq('id', id).select('*, department:departments!users_department_id_fkey(*)').single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  if (changed.length > 0) {
    const action = updates.role ? 'assign_role' : updates.is_active === false ? 'deactivate_user' : updates.is_active === true ? 'activate_user' : 'update_user'
    await db.from('audit_logs').insert({ id: crypto.randomUUID(), admin_id, action, target_user_id: id, details: changed.join(', '), created_at: new Date().toISOString() })
  }

  return NextResponse.json(updated)
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const { searchParams } = new URL(req.url)
  const adminId = searchParams.get('admin_id')
  const hard = searchParams.get('hard') === 'true'

  const { data: admin } = await db.from('users').select('id').eq('id', adminId).eq('role', 'admin').single()
  if (!admin) return NextResponse.json({ error: 'Unauthorized: admin access required' }, { status: 403 })

  const { data: target } = await db.from('users').select('*').eq('id', id).single()
  if (!target) return NextResponse.json({ error: 'User not found' }, { status: 404 })
  if (id === adminId) return NextResponse.json({ error: 'Cannot delete your own account' }, { status: 400 })

  if (hard) {
    await db.from('users').delete().eq('id', id)
    await db.from('audit_logs').insert({ id: crypto.randomUUID(), admin_id: adminId, action: 'delete_user', target_user_id: id, details: `Hard deleted user ${target.full_name} (${target.email})`, created_at: new Date().toISOString() })
  } else {
    await db.from('users').update({ is_active: false }).eq('id', id)
    await db.from('audit_logs').insert({ id: crypto.randomUUID(), admin_id: adminId, action: 'deactivate_user', target_user_id: id, details: `Deactivated user ${target.full_name} (${target.email})`, created_at: new Date().toISOString() })
  }

  return NextResponse.json({ success: true })
}
