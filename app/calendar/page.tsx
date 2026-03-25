'use client'

import { useEffect, useState } from 'react'
import Nav from '@/components/Nav'
import PageWrapper from '@/components/PageWrapper'
import { LeaveRequest, PublicHoliday, LEAVE_TYPE_LABELS } from '@/lib/types'

const DEMO_USER = { id: 'u2', name: 'Bob Kimani', role: 'manager' as const }

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']
const DAYS_SHORT = ['Su','Mo','Tu','We','Th','Fr','Sa']

function getDaysInMonth(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate()
}

function getFirstDayOfMonth(year: number, month: number) {
  return new Date(year, month, 1).getDay()
}

export default function CalendarPage() {
  const today = new Date()
  const [viewYear, setViewYear] = useState(today.getFullYear())
  const [viewMonth, setViewMonth] = useState(today.getMonth())
  const [leaves, setLeaves] = useState<LeaveRequest[]>([])
  const [holidays, setHolidays] = useState<PublicHoliday[]>([])

  useEffect(() => {
    Promise.all([
      fetch('/api/leave-requests?status=approved').then(r => r.json()),
      fetch('/api/public-holidays').then(r => r.json()),
    ]).then(([l, h]) => {
      setLeaves(l)
      setHolidays(h)
    })
  }, [])

  const prevMonth = () => {
    if (viewMonth === 0) { setViewYear(y => y - 1); setViewMonth(11) }
    else setViewMonth(m => m - 1)
  }
  const nextMonth = () => {
    if (viewMonth === 11) { setViewYear(y => y + 1); setViewMonth(0) }
    else setViewMonth(m => m + 1)
  }

  const daysInMonth = getDaysInMonth(viewYear, viewMonth)
  const firstDay = getFirstDayOfMonth(viewYear, viewMonth)

  const getEventsForDay = (day: number) => {
    const dateStr = `${viewYear}-${String(viewMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
    const dayLeaves = leaves.filter(r => r.start_date <= dateStr && r.end_date >= dateStr)
    const holiday = holidays.find(h => h.date === dateStr)
    return { dayLeaves, holiday }
  }

  return (
    <>
      <Nav userRole={DEMO_USER.role} userName={DEMO_USER.name} />
      <PageWrapper title="Leave Calendar" subtitle="Team schedule and public holidays">
        <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
          {/* Month nav */}
          <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
            <button onClick={prevMonth} className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors">
              <svg className="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <h2 className="text-[14px] font-semibold text-gray-900">
              {MONTHS[viewMonth]} {viewYear}
            </h2>
            <button onClick={nextMonth} className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors">
              <svg className="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </div>

          {/* Day headers */}
          <div className="grid grid-cols-7 border-b border-gray-100">
            {DAYS_SHORT.map(d => (
              <div key={d} className="py-2 text-center text-[11px] font-semibold text-gray-400 uppercase tracking-wide">
                {d}
              </div>
            ))}
          </div>

          {/* Calendar grid */}
          <div className="grid grid-cols-7">
            {/* Empty cells before month start */}
            {[...Array(firstDay)].map((_, i) => (
              <div key={`empty-${i}`} className="min-h-[80px] border-b border-r border-gray-50" />
            ))}

            {/* Days */}
            {[...Array(daysInMonth)].map((_, i) => {
              const day = i + 1
              const { dayLeaves, holiday } = getEventsForDay(day)
              const isToday =
                day === today.getDate() &&
                viewMonth === today.getMonth() &&
                viewYear === today.getFullYear()

              return (
                <div
                  key={day}
                  className={`min-h-[80px] border-b border-r border-gray-50 p-1.5 ${isToday ? 'bg-blue-50/50' : ''}`}
                >
                  <div className={`text-[12px] font-medium w-6 h-6 flex items-center justify-center rounded-full mb-1 ${
                    isToday ? 'bg-blue-500 text-white' : 'text-gray-700'
                  }`}>
                    {day}
                  </div>

                  {holiday && (
                    <div className="text-[10px] rounded px-1 py-0.5 bg-purple-100 text-purple-700 truncate mb-0.5">
                      {holiday.name}
                    </div>
                  )}

                  {dayLeaves.slice(0, 2).map(r => (
                    <div
                      key={r.id}
                      className="text-[10px] rounded px-1 py-0.5 bg-orange-100 text-orange-700 truncate mb-0.5"
                      title={`${(r as LeaveRequest & { user?: { full_name: string } }).user?.full_name} — ${LEAVE_TYPE_LABELS[r.leave_type]}`}
                    >
                      {(r as LeaveRequest & { user?: { full_name: string } }).user?.full_name ?? 'Employee'}
                    </div>
                  ))}
                  {dayLeaves.length > 2 && (
                    <div className="text-[10px] text-gray-400">+{dayLeaves.length - 2} more</div>
                  )}
                </div>
              )
            })}
          </div>
        </div>

        {/* Legend */}
        <div className="flex gap-4 mt-4">
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded-sm bg-orange-100 border border-orange-200" />
            <span className="text-[12px] text-gray-500">Leave</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded-sm bg-purple-100 border border-purple-200" />
            <span className="text-[12px] text-gray-500">Public Holiday</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded-full bg-blue-500" />
            <span className="text-[12px] text-gray-500">Today</span>
          </div>
        </div>
      </PageWrapper>
    </>
  )
}
