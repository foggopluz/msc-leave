import { NextResponse } from 'next/server'
import { users, departments, leaveRequests } from '@/lib/store'
import { DashboardStats } from '@/lib/types'

export async function GET() {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const todayStr = today.toISOString().split('T')[0]

  const activeUsers = users.filter(u => u.is_active)

  // Employees on leave today
  const onLeaveIds = new Set(
    leaveRequests
      .filter(r => {
        if (r.status !== 'approved') return false
        const start = new Date(r.start_date)
        const end = new Date(r.end_date)
        start.setHours(0, 0, 0, 0)
        end.setHours(0, 0, 0, 0)
        return today >= start && today <= end
      })
      .map(r => r.user_id)
  )

  const on_leave_today = onLeaveIds.size
  const total_employees = activeUsers.length
  const on_duty_today = total_employees - on_leave_today

  const pending_approvals = leaveRequests.filter(r => r.status === 'pending').length

  // Department summaries
  const deptSummaries = departments.map(d => {
    const deptUsers = activeUsers.filter(u => u.department_id === d.id)
    const deptOnLeave = deptUsers.filter(u => onLeaveIds.has(u.id)).length
    return {
      id: d.id,
      name: d.name,
      total: deptUsers.length,
      on_leave: deptOnLeave,
      on_duty: deptUsers.length - deptOnLeave,
    }
  })

  // Upcoming leaves (next 14 days, approved)
  const in14Days = new Date(today)
  in14Days.setDate(in14Days.getDate() + 14)

  const upcoming = leaveRequests
    .filter(r => {
      if (r.status !== 'approved') return false
      const start = new Date(r.start_date)
      start.setHours(0, 0, 0, 0)
      return start > today && start <= in14Days
    })
    .slice(0, 10)
    .map(r => ({
      ...r,
      user: users.find(u => u.id === r.user_id),
    }))

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
