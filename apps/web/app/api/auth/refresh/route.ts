import { NextRequest, NextResponse } from 'next/server'

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000'

export async function POST(request: NextRequest) {
  try {
    const refreshToken = request.cookies.get('refreshToken')?.value

    if (!refreshToken) {
      return NextResponse.json(
        { error: 'No refresh token' },
        { status: 401 }
      )
    }

    const response = await fetch(`${API_BASE}/auth/refresh`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${refreshToken}`
      }
    })

    if (!response.ok) {
      return NextResponse.json(
        { error: 'Token refresh failed' },
        { status: 401 }
      )
    }

    const data = await response.json()

    const result = NextResponse.json({ success: true })

    // Rotate cookies
    result.cookies.set('accessToken', data.accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 15 * 60
    })

    if (data.refreshToken) {
      result.cookies.set('refreshToken', data.refreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 30 * 24 * 60 * 60 // 30 days
      })
    }

    return result
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Refresh failed'
    return NextResponse.json({ error: message }, { status: 401 })
  }
}
