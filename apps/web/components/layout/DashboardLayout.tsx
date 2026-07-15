'use client'

import React from 'react'
import Link from 'next/link'
import { useAuth } from '@/lib/AuthProvider'
import { useToast } from '@/lib/toast'

interface DashboardLayoutProps {
  children: React.ReactNode
}

export function DashboardLayout({ children }: DashboardLayoutProps) {
  const { user, isLoading, logout } = useAuth()
  const { addToast } = useToast()
  const [isLoggingOut, setIsLoggingOut] = React.useState(false)

  const handleLogout = async () => {
    setIsLoggingOut(true)
    try {
      await logout()
      addToast('Logged out successfully', 'success')
    } catch {
      addToast('Logout failed', 'error')
    } finally {
      setIsLoggingOut(false)
    }
  }

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-slate-50">
        <div className="text-slate-600">Loading...</div>
      </div>
    )
  }

  return (
    <div className="flex h-screen bg-slate-50">
      {/* Sidebar */}
      <aside className="w-64 bg-white border-r border-slate-200 shadow-sm flex flex-col">
        <div className="p-6 border-b border-slate-200">
          <h1 className="text-2xl font-bold text-slate-900">BROTE</h1>
          {user && (
            <p className="text-sm text-slate-600 mt-2">
              {user.email}
            </p>
          )}
        </div>

        <nav className="p-4 space-y-2 flex-1">
          <NavLink href="/" label="Dashboard" />
          <NavLink href="/contacts" label="Contacts" />
          <NavLink href="/templates" label="Templates" />
          <NavLink href="/campaigns" label="Campaigns" />
          <NavLink href="/channels" label="Channels" />
          <NavLink href="/analytics" label="Analytics" />
          <NavLink href="/settings" label="Settings" />
        </nav>

        <div className="p-4 border-t border-slate-200 bg-white">
          <button
            onClick={handleLogout}
            disabled={isLoggingOut}
            className="w-full px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100 rounded-lg disabled:opacity-50"
          >
            {isLoggingOut ? 'Logging out...' : 'Logout'}
          </button>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-auto">
        <div className="p-8">{children}</div>
      </main>
    </div>
  )
}

function NavLink({ href, label }: { href: string; label: string }) {
  return (
    <Link
      href={href}
      className="block px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
    >
      {label}
    </Link>
  )
}
