import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { verifyPassword, createToken, setAuthCookie, isValidEmail } from '@/lib/auth'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { email, password } = body

    // Validate input
    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email and password are required' },
        { status: 400 }
      )
    }

    if (!isValidEmail(email)) {
      return NextResponse.json(
        { error: 'Invalid email format' },
        { status: 400 }
      )
    }

    // Find user with their workspace memberships
    const user = await prisma.user.findUnique({
      where: { email },
      include: {
        workspaces: {
          include: {
            workspace: true
          },
          orderBy: {
            createdAt: 'asc' // Get the first workspace they joined
          }
        }
      }
    })

    if (!user) {
      return NextResponse.json(
        { error: 'Invalid email or password' },
        { status: 401 }
      )
    }

    // Verify password
    const isValidPassword = await verifyPassword(password, user.password)
    if (!isValidPassword) {
      return NextResponse.json(
        { error: 'Invalid email or password' },
        { status: 401 }
      )
    }

    // Get user's primary workspace (first one they joined)
    const primaryWorkspace = user.workspaces[0]?.workspace
    
    if (!primaryWorkspace) {
      return NextResponse.json(
        { error: 'User has no workspace access' },
        { status: 403 }
      )
    }

    // Create JWT token
    const token = await createToken({
      userId: user.id,
      email: user.email,
      workspaceId: primaryWorkspace.id
    })

    // Set auth cookie
    await setAuthCookie(token)

    return NextResponse.json({
      message: 'Login successful',
      user: {
        id: user.id,
        email: user.email,
        name: user.name
      },
      workspace: {
        id: primaryWorkspace.id,
        name: primaryWorkspace.name,
        slug: primaryWorkspace.slug
      }
    })

  } catch (error) {
    console.error('Login error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}