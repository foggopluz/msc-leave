'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState } from 'react'
import { canApprove, canManageEmployees, canImportEmployees, canAccessSettings, canAccessAdmin } from '@/lib/permissions'
import { useDemoUser, DEMO_USERS } from '@/lib/demo-user'
import { ROLE_LABELS } from '@/lib/types'

interface NavProps {
  unreadCount?: number
}

const navLinks = (role: string) => {
  const links = [
    { href: '/dashboard', label: 'Dashboard' },
    { href: '/leave', label: 'My Leave' },
  ]
  if (canApprove(role as never)) links.push({ href: '/approvals', label: 'Approvals' })
  if (canManageEmployees(role as never)) links.push({ href: '/employees', label: 'Employees' })
  if (canImportEmployees(role as never)) links.push({ href: '/import', label: 'Import' })
  links.push({ href: '/calendar', label: 'Calendar' })
  if (canAccessSettings(role as never)) links.push({ href: '/settings', label: 'Settings' })
  return links
}

export default function Nav({ unreadCount = 0 }: NavProps) {
  const pathname = usePathname()
  const { user, setUser, all } = useDemoUser()
  const [menuOpen, setMenuOpen] = useState(false)
  const [switcherOpen, setSwitcherOpen] = useState(false)
  const links = navLinks(user.role)
  const isAdmin = canAccessAdmin(user.role as never)

  return (
    <nav className="sticky top-0 z-50 bg-white/80 backdrop-blur-xl border-b border-gray-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-14">

          {/* Logo */}
          <Link href="/dashboard" className="flex items-center gap-2">
            <span className="text-[15px] font-semibold tracking-tight text-gray-900">Naenda</span>
          </Link>

          {/* Desktop links */}
          <div className="hidden md:flex items-center gap-1">
            {links.map(link => (
              <Link
                key={link.href}
                href={link.href}
                className={`px-3 py-1.5 rounded-lg text-[13px] font-medium transition-colors ${
                  pathname.startsWith(link.href)
                    ? 'bg-gray-100 text-gray-900'
                    : 'text-gray-500 hover:text-gray-900 hover:bg-gray-50'
                }`}
              >
                {link.label}
              </Link>
            ))}
            {/* Admin Zone: only visible to admin role */}
            {isAdmin && (
              <Link
                href="/admin"
                className={`px-3 py-1.5 rounded-lg text-[13px] font-medium transition-colors ${
                  pathname.startsWith('/admin')
                    ? 'bg-red-50 text-red-700'
                    : 'text-red-500 hover:text-red-700 hover:bg-red-50'
                }`}
              >
                Admin Zone
              </Link>
            )}
          </div>

          {/* Right side */}
          <div className="flex items-center gap-3">
            {/* Notifications */}
            <Link
              href="/notifications"
              className="relative p-1.5 rounded-lg text-gray-500 hover:text-gray-900 hover:bg-gray-50 transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                  d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6 6 0 10-12 0v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
              </svg>
              {unreadCount > 0 && (
                <span className="absolute top-0.5 right-0.5 w-4 h-4 rounded-full bg-blue-500 text-white text-[10px] font-bold flex items-center justify-center">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </Link>

            {/* User switcher (demo mode) */}
            <div className="hidden md:block relative">
              <button
                onClick={() => setSwitcherOpen(o => !o)}
                className="flex items-center gap-2 pl-3 border-l border-gray-100 hover:opacity-80 transition-opacity"
              >
                <div className={`w-7 h-7 rounded-full text-[11px] font-semibold flex items-center justify-center ${
                  isAdmin ? 'bg-red-600 text-white' : 'bg-gray-900 text-white'
                }`}>
                  {user.name.charAt(0).toUpperCase()}
                </div>
                <div className="text-left">
                  <p className="text-[13px] text-gray-700 font-medium leading-none">{user.name}</p>
                  <p className={`text-[11px] mt-0.5 ${isAdmin ? 'text-red-500' : 'text-gray-400'}`}>
                    {ROLE_LABELS[user.role]}
                  </p>
                </div>
                <svg className="w-3.5 h-3.5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>

              {switcherOpen && (
                <>
                  <div className="fixed inset-0 z-10" onClick={() => setSwitcherOpen(false)} />
                  <div className="absolute right-0 top-full mt-2 w-56 bg-white rounded-2xl border border-gray-100 shadow-lg z-20 overflow-hidden">
                    <div className="px-3 py-2 border-b border-gray-100">
                      <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wide">Demo / Switch User</p>
                    </div>
                    {all.map(u => (
                      <button
                        key={u.id}
                        onClick={() => { setUser(u); setSwitcherOpen(false) }}
                        className={`w-full flex items-center gap-2.5 px-3 py-2.5 text-left hover:bg-gray-50 transition-colors ${
                          u.id === user.id ? 'bg-blue-50' : ''
                        }`}
                      >
                        <div className={`w-7 h-7 rounded-full text-[11px] font-semibold flex items-center justify-center flex-shrink-0 ${
                          u.id === user.id ? 'bg-blue-600 text-white' : u.role === 'admin' ? 'bg-red-100 text-red-600' : 'bg-gray-200 text-gray-600'
                        }`}>
                          {u.name.charAt(0)}
                        </div>
                        <div>
                          <p className="text-[13px] font-medium text-gray-900 leading-none">{u.name}</p>
                          <p className={`text-[11px] mt-0.5 ${u.role === 'admin' ? 'text-red-500' : 'text-gray-400'}`}>
                            {ROLE_LABELS[u.role]}
                          </p>
                        </div>
                        {u.id === user.id && (
                          <svg className="w-4 h-4 text-blue-500 ml-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                        )}
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>

            {/* Mobile menu toggle */}
            <button
              onClick={() => setMenuOpen(o => !o)}
              className="md:hidden p-1.5 rounded-lg text-gray-500 hover:bg-gray-50"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                {menuOpen
                  ? <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M6 18L18 6M6 6l12 12" />
                  : <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 6h16M4 12h16M4 18h16" />}
              </svg>
            </button>
          </div>
        </div>
      </div>

      {/* Mobile menu */}
      {menuOpen && (
        <div className="md:hidden border-t border-gray-100 px-4 py-2 space-y-1">
          {links.map(link => (
            <Link
              key={link.href}
              href={link.href}
              onClick={() => setMenuOpen(false)}
              className={`block px-3 py-2 rounded-lg text-[13px] font-medium transition-colors ${
                pathname.startsWith(link.href)
                  ? 'bg-gray-100 text-gray-900'
                  : 'text-gray-500 hover:text-gray-900 hover:bg-gray-50'
              }`}
            >
              {link.label}
            </Link>
          ))}
          {isAdmin && (
            <Link
              href="/admin"
              onClick={() => setMenuOpen(false)}
              className="block px-3 py-2 rounded-lg text-[13px] font-medium text-red-500 hover:bg-red-50"
            >
              Admin Zone
            </Link>
          )}
          {/* Mobile user switcher */}
          <div className="pt-2 border-t border-gray-100">
            <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wide px-3 pb-1">Switch User</p>
            {all.map(u => (
              <button
                key={u.id}
                onClick={() => { setUser(u); setMenuOpen(false) }}
                className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-left ${
                  u.id === user.id ? 'bg-blue-50' : 'hover:bg-gray-50'
                }`}
              >
                <div className={`w-6 h-6 rounded-full text-[10px] font-bold flex items-center justify-center ${
                  u.id === user.id ? 'bg-blue-600 text-white' : u.role === 'admin' ? 'bg-red-100 text-red-600' : 'bg-gray-200 text-gray-600'
                }`}>
                  {u.name.charAt(0)}
                </div>
                <span className="text-[13px] text-gray-700">{u.name}</span>
                <span className={`text-[11px] ${u.role === 'admin' ? 'text-red-500' : 'text-gray-400'}`}>
                  ({ROLE_LABELS[u.role]})
                </span>
              </button>
            ))}
          </div>
        </div>
      )}
    </nav>
  )
}
