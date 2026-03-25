import { NextRequest, NextResponse } from 'next/server'
import { users, departments, leaveRequests } from '@/lib/store'
import { DashboardStats } from '@/lib/types'
import { canViewAllDepartments } from '@/lib/permissions'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const userId = searchParams.get('user_id')

  const today = new Date()
  today.setHours(0, 0, 0, 0)

  // Determine which users are visible based on the requesting user's role
  const requestingUser = userId ? users.find(u => u.id === userId) : null
  const role = requestingUser?.role ?? 'employee'
  const deptId = requestingUser?.department_id ?? null

  let visibleUsers = users.filter(u => u.is_active)
  if (!canViewAllDepartments(role)) {
    // Manager: only their department
    visibleUsers = deptId
      ? visibleUsers.filter(u => u.department_id === deptId)
      : visibleUsers.filter(u => u.id === userId)
  }

  const visibleUserIds = new Set(visibleUsers.map(u => u.id))

  // Employees on leave today (within visible scope)
  const onLeaveIds = new Set(
    leaveRequests
      .filter(r => {
        if (r.status !== 'approved') return false
        if (!visibleUserIds.has(r.user_id)) return false
        const start = new Date(r.start_date)
        const end = new Date(r.end_date)
        start.setHours(0, 0, 0, 0)
        end.setHours(0, 0, 0, 0)
        return today >= start && today <= end
      })
      .map(r => r.user_id)
  )

  const total_employees = visibleUsers.length
  const on_leave_today = onLeaveIds.size
  const on_duty_today = total_employees - on_leave_today

  // Pending approvals (only those relevant to this user's approval stage)
  const pending_approvals = leaveRequests.filter(r => {
    if (r.status !== 'pending') return false
    if (role === 'manager') return r.current_stage === 'manager' && visibleUserIds.has(r.user_id)
    if (role === 'hr') return r.current_stage === 'hr'
    if (role === 'gm') return r.current_stage === 'gm'
    return false
  }).length

  // Department summaries (only visible departments)
  const visibleDepts = canViewAllDepartments(role)
    ? departments
    : deptId ? departments.filter(d => d.id === deptId) : []

  const deptSummaries = visibleDepts.map(d => {
    const deptUsers = visibleUsers.filter(u => u.department_id === d.id)
    const deptOnLeave = deptUsers.filter(u => onLeaveIds.has(u.id)).length
    return {
      id: d.id,
      name: d.name,
      total: deptUsers.length,
      on_leave: deptOnLeave,
      on_duty: deptUsers.length - deptOnLeave,
    }
  })

  // Upcoming leaves (next 14 days, within visible scope)
  const in14Days = new Date(today)
  in14Days.setDate(in14Days.getDate() + 14)

  const upcoming = leaveRequests
    .filter(r => {
      if (r.status !== 'approved') return false
      if (!visibleUserIds.has(r.user_id)) return false
      const start = new Date(r.start_date)
      start.setHours(0, 0, 0, 0)
      return start > today && start <= in14Days
    })
    .slice(0, 10)
    .map(r => ({ ...r, user: users.find(u => u.id === r.user_id) }))

  const stats: DashboardStats = {
    total_employees,
    on_duty_today,
    on_leave_today,
    pending_approvals,
    departments: deptSummaries,
    upcoming_leaves: upcoming,
  }

  return NextResponse.json(stats)
}
