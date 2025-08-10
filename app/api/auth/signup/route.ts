import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { hashPassword, createToken, setAuthCookie, isValidEmail, isValidPassword, generateSlug } from '@/lib/auth'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { email, password, name, workspaceName } = body

    // Validate input
    if (!email || !password || !name || !workspaceName) {
      return NextResponse.json(
        { error: 'Email, password, name, and workspace name are required' },
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

    // Generate workspace slug
    const workspaceSlug = generateSlug(workspaceName)
    
    // Check if workspace slug already exists
    const existingWorkspace = await prisma.workspace.findUnique({
      where: { slug: workspaceSlug }
    })

    if (existingWorkspace) {
      return NextResponse.json(
        { error: 'Workspace name already taken, please choose another' },
        { status: 409 }
      )
    }

    // Hash password
    const hashedPassword = await hashPassword(password)

    // Create user and workspace in a transaction
    const result = await prisma.$transaction(async (tx) => {
      // Create user
      const user = await tx.user.create({
        data: {
          email,
          password: hashedPassword,
          name
        }
      })

      // Create workspace
      const workspace = await tx.workspace.create({
        data: {
          name: workspaceName,
          slug: workspaceSlug
        }
      })

      // Add user to workspace
      await tx.workspaceUser.create({
        data: {
          userId: user.id,
          workspaceId: workspace.id,
          role: 'owner'
        }
      })

      return { user, workspace }
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
      message: 'User and workspace created successfully',
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