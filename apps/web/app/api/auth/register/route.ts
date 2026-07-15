import { NextRequest, NextResponse } from 'next/server'

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000'

interface RegisterResponse {
  success: boolean
  data?: {
    workspaceId: string
    userId: string
    accessToken: string
    refreshToken?: string
  }
  error?: string
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { ownerName, ownerEmail, ownerPassword, workspaceName, timezone } = body

    console.log('[REGISTER] Request body:', { ownerName, ownerEmail, workspaceName })

    if (!ownerName || !ownerEmail || !ownerPassword || !workspaceName) {
      console.log('[REGISTER] Missing fields')
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    console.log(`[REGISTER] Calling backend: ${API_BASE}/auth/register`)

    // Build request body - only include timezone if provided
    const backendBody: Record<string, string> = {
      ownerName,
      ownerEmail,
      ownerPassword,
      workspaceName
    }
    if (timezone) {
      backendBody.timezone = timezone
    }

    // Call backend directly to get both tokens
    const backendResponse = await fetch(`${API_BASE}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(backendBody)
    })

    console.log('[REGISTER] Backend response status:', backendResponse.status)

    const result = await backendResponse.json() as RegisterResponse
    console.log('[REGISTER] Backend response:', JSON.stringify(result))

    if (!backendResponse.ok) {
      const statusCode = backendResponse.status === 409 ? 409 : 400
      return NextResponse.json(
        { error: result.error || 'Registration failed' },
        { status: statusCode }
      )
    }

    const response = NextResponse.json({
      workspaceId: result.data?.workspaceId,
      userId: result.data?.userId,
      accessToken: result.data?.accessToken
    })

    // Set httpOnly cookies
    if (result.data?.accessToken) {
      response.cookies.set('accessToken', result.data.accessToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 15 * 60
      })
    }

    if (result.data?.refreshToken) {
      response.cookies.set('refreshToken', result.data.refreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 30 * 24 * 60 * 60
      })
    }

    return response
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Registration failed'
    console.log('[REGISTER] Error:', message, error)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
