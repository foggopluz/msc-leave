import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { DashboardStats } from '@/lib/types'
import { canViewAllDepartments } from '@/lib/permissions'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const userId = searchParams.get('user_id')

  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const todayStr = today.toISOString().split('T')[0]

  const { data: requestingUser } = userId
    ? await db.from('users').select('role, department_id').eq('id', userId).single()
    : { data: null }

  const role = requestingUser?.role ?? 'employee'
  const deptId = requestingUser?.department_id ?? null

  let usersQuery = db.from('users').select('id, department_id').eq('is_active', true)
  if (!canViewAllDepartments(role)) {
    if (deptId) usersQuery = usersQuery.eq('department_id', deptId)
    else if (userId) usersQuery = usersQuery.eq('id', userId)
  }

  const { data: visibleUsers } = await usersQuery
  const visibleUserIds = (visibleUsers ?? []).map(u => u.id)

  if (visibleUserIds.length === 0) {
    const stats: DashboardStats = {
      total_employees: 0,
      on_duty_today: 0,
      on_leave_today: 0,
      pending_approvals: 0,
      departments: [],
      upcoming_leaves: [],
    }
    return NextResponse.json(stats)
  }

  // On leave today
  const { data: onLeaveToday } = await db.from('leave_requests')
    .select('user_id')
    .eq('status', 'approved')
    .lte('start_date', todayStr)
    .gte('end_date', todayStr)
    .in('user_id', visibleUserIds)

  const onLeaveSet = new Set((onLeaveToday ?? []).map(r => r.user_id))

  // Pending approvals
  let pendingQuery = db.from('leave_requests').select('id, current_stage, user_id').eq('status', 'pending')
  const { data: pendingAll } = await pendingQuery
  const pending_approvals = (pendingAll ?? []).filter(r => {
    if (role === 'manager') return r.current_stage === 'manager' && visibleUserIds.includes(r.user_id)
    if (role === 'hr') return r.current_stage === 'hr'
    if (role === 'gm') return r.current_stage === 'gm'
    return false
  }).length

  // Departments
  const { data: depts } = canViewAllDepartments(role)
    ? await db.from('departments').select('id, name')
    : deptId
      ? await db.from('departments').select('id, name').eq('id', deptId)
      : { data: [] }

  const deptSummaries = (depts ?? []).map(d => {
    const deptUsers = (visibleUsers ?? []).filter(u => u.department_id === d.id)
    const deptOnLeave = deptUsers.filter(u => onLeaveSet.has(u.id)).length
    return { id: d.id, name: d.name, total: deptUsers.length, on_leave: deptOnLeave, on_duty: deptUsers.length - deptOnLeave }
  })

  // Upcoming leaves
  const in14Str = new Date(today.getTime() + 14 * 86400000).toISOString().split('T')[0]
  const { data: upcoming } = await db.from('leave_requests')
    .select('*, user:users!leave_requests_user_id_fkey(*)')
    .eq('status', 'approved')
    .gt('start_date', todayStr)
    .lte('start_date', in14Str)
    .in('user_id', visibleUserIds)
    .limit(10)

  const stats: DashboardStats = {
    total_employees: visibleUserIds.length,
    on_duty_today: visibleUserIds.length - onLeaveSet.size,
    on_leave_today: onLeaveSet.size,
    pending_approvals,
    departments: deptSummaries,
    upcoming_leaves: upcoming ?? [],
  }

  return NextResponse.json(stats)
}
