'use client'

import { useState } from 'react'
import { LeaveType, LeaveBalance, LEAVE_TYPE_LABELS } from '@/lib/types'
import { calculateLeaveDays } from '@/lib/accrual'

interface LeaveFormProps {
  userId: string
  balances: LeaveBalance[]
  onSubmit?: (data: {
    user_id: string
    leave_type: LeaveType
    start_date: string
    end_date: string
    notes: string
    days_requested: number
  }) => Promise<void>
}

export default function LeaveForm({ userId, balances, onSubmit }: LeaveFormProps) {
  const [leaveType, setLeaveType] = useState<LeaveType>('annual')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [notes, setNotes] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)

  const days =
    startDate && endDate
      ? calculateLeaveDays(new Date(startDate), new Date(endDate))
      : 0

  const balance = balances.find(b => b.leave_type === leaveType)?.balance ?? 0

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setSuccess(false)

    if (!startDate || !endDate) return setError('Please select a date range')
    if (days === 0) return setError('No working days in selected range')
    if (days > balance) return setError(`Insufficient balance (${balance} days available)`)

    setLoading(true)
    try {
      await onSubmit?.({
        user_id: userId,
        leave_type: leaveType,
        start_date: startDate,
        end_date: endDate,
        notes,
        days_requested: days,
      })
      setSuccess(true)
      setStartDate('')
      setEndDate('')
      setNotes('')
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Submission failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Leave type */}
      <div>
        <label className="block text-[12px] font-medium text-gray-700 mb-1.5">Leave Type</label>
        <select
          value={leaveType}
          onChange={e => setLeaveType(e.target.value as LeaveType)}
          className="w-full px-3 py-2 rounded-xl border border-gray-200 text-[13px] text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400"
        >
          {balances.map(b => (
            <option key={b.leave_type} value={b.leave_type}>
              {LEAVE_TYPE_LABELS[b.leave_type]} ({b.balance} days available)
            </option>
          ))}
        </select>
      </div>

      {/* Date range */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-[12px] font-medium text-gray-700 mb-1.5">Start Date</label>
          <input
            type="date"
            value={startDate}
            onChange={e => setStartDate(e.target.value)}
            className="w-full px-3 py-2 rounded-xl border border-gray-200 text-[13px] text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400"
          />
        </div>
        <div>
          <label className="block text-[12px] font-medium text-gray-700 mb-1.5">End Date</label>
          <input
            type="date"
            value={endDate}
            min={startDate}
            onChange={e => setEndDate(e.target.value)}
            className="w-full px-3 py-2 rounded-xl border border-gray-200 text-[13px] text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400"
          />
        </div>
      </div>

      {/* Preview */}
      {days > 0 && (
        <div className={`rounded-xl px-4 py-3 text-[13px] ${days > balance ? 'bg-red-50 text-red-700' : 'bg-blue-50 text-blue-700'}`}>
          <span className="font-semibold">{days} working day{days !== 1 ? 's' : ''}</span>
          {' '}will be deducted.{' '}
          {days > balance
            ? `Insufficient balance (${balance} days available).`
            : `${balance - days} days remaining after approval.`}
        </div>
      )}

      {/* Notes */}
      <div>
        <label className="block text-[12px] font-medium text-gray-700 mb-1.5">
          Notes <span className="text-gray-400 font-normal">(optional)</span>
        </label>
        <textarea
          value={notes}
          onChange={e => setNotes(e.target.value)}
          rows={2}
          placeholder="Add a reason or note..."
          className="w-full px-3 py-2 rounded-xl border border-gray-200 text-[13px] text-gray-900 bg-white resize-none focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400"
        />
      </div>

      {error && <p className="text-[12px] text-red-600">{error}</p>}
      {success && <p className="text-[12px] text-green-600">Leave request submitted successfully.</p>}

      <button
        type="submit"
        disabled={loading || days === 0 || days > balance}
        className="w-full py-2.5 rounded-xl bg-gray-900 text-white text-[13px] font-medium hover:bg-gray-800 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
      >
        {loading ? 'Submitting…' : 'Submit Request'}
      </button>
    </form>
  )
}
