import { NextRequest, NextResponse } from 'next/server'

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000'

export async function GET(request: NextRequest) {
  try {
    const token = request.cookies.get('accessToken')?.value

    if (!token) {
      return NextResponse.json({ error: 'No token' }, { status: 401 })
    }

    // Call backend to get current user info
    const response = await fetch(`${API_BASE}/auth/me`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    })

    if (!response.ok) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const data = await response.json()
    return NextResponse.json(data.data)
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to get user'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
