import { NextRequest, NextResponse } from 'next/server'

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000'

export async function POST(request: NextRequest) {
  try {
    const token = request.cookies.get('accessToken')?.value

    if (token) {
      // Call backend logout endpoint
      await fetch(`${API_BASE}/auth/logout`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      }).catch(() => {
        // Logout endpoint may fail, but we still clear cookies
      })
    }

    const response = NextResponse.json({ success: true })

    // Clear cookies
    response.cookies.delete('accessToken')
    response.cookies.delete('refreshToken')

    return response
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Logout failed'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
