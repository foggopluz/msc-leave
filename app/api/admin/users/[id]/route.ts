import { NextRequest, NextResponse } from 'next/server'
import { users, departments, leaveBalances, logAdminAction } from '@/lib/store'

// PATCH /api/admin/users/[id] — update user (admin only)
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const body = await req.json()
  const { admin_id, ...updates } = body

  const admin = users.find(u => u.id === admin_id && u.role === 'admin')
  if (!admin) {
    return NextResponse.json({ error: 'Unauthorized: admin access required' }, { status: 403 })
  }

  const user = users.find(u => u.id === id)
  if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 })

  const allowed = ['full_name', 'email', 'department_id', 'role', 'is_active', 'joining_date'] as const
  const changed: string[] = []

  for (const key of allowed) {
    if (key in updates && updates[key] !== undefined) {
      const prev = user[key]
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ;(user as any)[key] = updates[key]
      if (prev !== updates[key]) changed.push(`${key}: ${prev} → ${updates[key]}`)
    }
  }

  if (changed.length > 0) {
    const action = updates.role ? 'assign_role'
      : updates.is_active === false ? 'deactivate_user'
      : updates.is_active === true ? 'activate_user'
      : 'update_user'

    logAdminAction(admin_id, action, id, changed.join(', '))
  }

  return NextResponse.json({
    ...user,
    department: departments.find(d => d.id === user.department_id) ?? null,
  })
}

// DELETE /api/admin/users/[id] — hard or soft delete (admin only)
export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const { searchParams } = new URL(req.url)
  const adminId = searchParams.get('admin_id')
  const hard = searchParams.get('hard') === 'true'

  const admin = users.find(u => u.id === adminId && u.role === 'admin')
  if (!admin) {
    return NextResponse.json({ error: 'Unauthorized: admin access required' }, { status: 403 })
  }

  const idx = users.findIndex(u => u.id === id)
  if (idx === -1) return NextResponse.json({ error: 'User not found' }, { status: 404 })

  const target = users[idx]

  // Prevent self-deletion
  if (id === adminId) {
    return NextResponse.json({ error: 'Cannot delete your own account' }, { status: 400 })
  }

  if (hard) {
    users.splice(idx, 1)
    logAdminAction(adminId, 'delete_user', id, `Hard deleted user ${target.full_name} (${target.email})`)
  } else {
    users[idx].is_active = false
    logAdminAction(adminId, 'deactivate_user', id, `Deactivated user ${target.full_name} (${target.email})`)
  }

  return NextResponse.json({ success: true })
}
