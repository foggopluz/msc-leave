'use client'

import { useEffect, useState } from 'react'
import Nav from '@/components/Nav'
import PageWrapper from '@/components/PageWrapper'
import { Notification } from '@/lib/types'
import { useDemoUser } from '@/lib/demo-user'
import { createClient } from '@/lib/supabase'

const TYPE_CONFIG: Record<Notification['type'], { icon: string; color: string; bg: string }> = {
  submitted: { icon: '↑', color: 'text-blue-600', bg: 'bg-blue-50' },
  approved:  { icon: '✓', color: 'text-green-600', bg: 'bg-green-50' },
  rejected:  { icon: '✕', color: 'text-red-600', bg: 'bg-red-50' },
  reminder:  { icon: '◷', color: 'text-amber-600', bg: 'bg-amber-50' },
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  return `${Math.floor(hrs / 24)}d ago`
}

export default function NotificationsPage() {
  const { user } = useDemoUser()
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [loading, setLoading] = useState(true)

  const load = () => {
    fetch(`/api/notifications?user_id=${user.id}`)
      .then(r => r.json())
      .then(data => { setNotifications(Array.isArray(data) ? data : []); setLoading(false) })
      .catch(() => setLoading(false))
  }

  useEffect(() => { load() }, [user.id])

  useEffect(() => {
    const supabase = createClient()
    const channel = supabase
      .channel('notifications')
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'notifications',
        filter: `user_id=eq.${user.id}`,
      }, () => { load() })
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [user.id])

  const markAllRead = async () => {
    await fetch('/api/notifications', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user_id: user.id }),
    })
    load()
  }

  const markRead = async (id: string) => {
    await fetch('/api/notifications', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id }),
    })
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n))
  }

  const unread = notifications.filter(n => !n.read).length

  return (
    <>
      <Nav unreadCount={unread} />
      <PageWrapper
        title="Notifications"
        subtitle={unread > 0 ? `${unread} unread` : 'All caught up'}
        action={
          unread > 0 ? (
            <button
              onClick={markAllRead}
              className="px-4 py-2 rounded-xl border border-gray-200 text-gray-700 text-[13px] font-medium hover:bg-gray-50 transition-colors"
            >
              Mark all read
            </button>
          ) : undefined
        }
      >
        <div className="max-w-2xl">
          {loading ? (
            <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="flex items-start gap-3 px-5 py-4 border-b border-gray-50 last:border-0">
                  <div className="w-8 h-8 rounded-full bg-gray-100 animate-pulse flex-shrink-0" />
                  <div className="flex-1 space-y-2 pt-0.5">
                    <div className="h-3 bg-gray-100 rounded animate-pulse w-3/4" />
                    <div className="h-2.5 bg-gray-100 rounded animate-pulse w-1/3" />
                  </div>
                </div>
              ))}
            </div>
          ) : notifications.length === 0 ? (
            <div className="bg-white rounded-2xl border border-gray-100 p-12 text-center">
              <svg className="w-10 h-10 mx-auto text-gray-200 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                  d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6 6 0 10-12 0v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
              </svg>
              <p className="text-[14px] font-medium text-gray-900 mb-1">All caught up</p>
              <p className="text-[13px] text-gray-400">No notifications yet. You'll be notified when your leave requests are updated.</p>
            </div>
          ) : (
            <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
              {notifications.map(n => {
                const cfg = TYPE_CONFIG[n.type]
                return (
                  <div
                    key={n.id}
                    onClick={() => !n.read && markRead(n.id)}
                    className={`flex items-start gap-3 px-5 py-4 border-b border-gray-50 last:border-0 transition-colors ${
                      n.read ? 'opacity-60' : 'cursor-pointer hover:bg-gray-50/60'
                    }`}
                  >
                    <div className={`w-8 h-8 rounded-full flex-shrink-0 flex items-center justify-center text-[13px] font-bold ${cfg.bg} ${cfg.color}`}>
                      {cfg.icon}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className={`text-[13px] text-gray-900 leading-snug ${n.read ? '' : 'font-medium'}`}>
                        {n.message}
                      </p>
                      <p className="text-[11px] text-gray-400 mt-0.5">{timeAgo(n.created_at)}</p>
                    </div>
                    {!n.read && (
                      <div className="w-2 h-2 rounded-full bg-blue-500 mt-1.5 flex-shrink-0" />
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </PageWrapper>
    </>
  )
}
