import React from 'react'

interface AuthLayoutProps {
  children: React.ReactNode
  title: string
}

export function AuthLayout({ children, title }: AuthLayoutProps) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 flex items-center justify-center px-4">
      <div className="w-full max-w-md space-y-8">
        <div className="text-center">
          <h1 className="text-4xl font-bold text-white mb-2">BROTE</h1>
          <h2 className="text-xl font-semibold text-slate-300 mb-8">{title}</h2>
        </div>

        <div className="bg-white rounded-lg shadow-xl p-8">
          {children}
        </div>

        <p className="text-center text-sm text-slate-400">
          © 2026 BROTE. All rights reserved.
        </p>
      </div>
    </div>
  )
}
