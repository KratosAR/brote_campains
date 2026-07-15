import React from 'react'
import clsx from 'clsx'

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode
}

export function Card({ className, children, ...props }: CardProps) {
  return (
    <div
      className={clsx(
        'bg-white rounded-lg border border-slate-200 shadow-sm p-6',
        className
      )}
      {...props}
    >
      {children}
    </div>
  )
}
