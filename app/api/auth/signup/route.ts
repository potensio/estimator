import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { hashPassword, createToken, setAuthCookie, isValidEmail, isValidPassword, generateSlug } from '@/lib/auth'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { email, password, name } = body

    // Validate input
    if (!email || !password || !name) {
      return NextResponse.json(
        { error: 'Email, password, and name are required' },
        { status: 400 }
      )
    }

    if (!isValidEmail(email)) {
      return NextResponse.json(
        { error: 'Invalid email format' },
        { status: 400 }
      )
    }

    if (!isValidPassword(password)) {
      return NextResponse.json(
        { error: 'Password must be at least 8 characters with uppercase, lowercase, and number' },
        { status: 400 }
      )
    }

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email }
    })

    if (existingUser) {
      return NextResponse.json(
        { error: 'User with this email already exists' },
        { status: 409 }
      )
    }

    // Auto-assign to specific workspace
    const defaultWorkspaceId = 'cme6kat59000llg0ptd8ud87b'
    
    // Check if the default workspace exists
    const defaultWorkspace = await prisma.workspace.findUnique({
      where: { id: defaultWorkspaceId }
    })

    if (!defaultWorkspace) {
      return NextResponse.json(
        { error: 'Default workspace not found' },
        { status: 500 }
      )
    }

    // Hash password
    const hashedPassword = await hashPassword(password)

    // Create user and assign to workspace in a transaction
    const result = await prisma.$transaction(async (tx) => {
      // Create user
      const user = await tx.user.create({
        data: {
          email,
          password: hashedPassword,
          name
        }
      })

      // Add user to default workspace
      await tx.workspaceUser.create({
        data: {
          userId: user.id,
          workspaceId: defaultWorkspaceId,
          role: 'member'
        }
      })

      return { user, workspace: defaultWorkspace }
    })

    // Create JWT token
    const token = await createToken({
      userId: result.user.id,
      email: result.user.email,
      workspaceId: result.workspace.id
    })

    // Set auth cookie
    await setAuthCookie(token)

    return NextResponse.json({
      message: 'User created and assigned to workspace successfully',
      user: {
        id: result.user.id,
        email: result.user.email,
        name: result.user.name
      },
      workspace: {
        id: result.workspace.id,
        name: result.workspace.name,
        slug: result.workspace.slug
      }
    }, { status: 201 })

  } catch (error) {
    console.error('Signup error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}