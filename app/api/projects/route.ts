import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { z } from 'zod'

// Import Prisma client directly to avoid type issues
import { PrismaClient } from '@prisma/client'

// Create a global prisma instance to avoid connection issues
const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

const prisma = globalForPrisma.prisma ?? new PrismaClient()

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma

const createProjectSchema = z.object({
  name: z.string().min(1, 'Project name is required'),
  description: z.string().optional(),
  company: z.string().optional()
})

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const body = await request.json()
    const validatedData = createProjectSchema.parse(body)

    // Get user's workspace
    const userWithWorkspace = await prisma.user.findUnique({
      where: { id: user.userId },
      include: {
        workspaces: {
          include: {
            workspace: true
          }
        }
      }
    })

    if (!userWithWorkspace || !userWithWorkspace.workspaces[0]) {
      return NextResponse.json(
        { error: 'No workspace found' },
        { status: 400 }
      )
    }

    const workspace = userWithWorkspace.workspaces[0].workspace

    // Create project in user's workspace
    const project = await prisma.project.create({
      data: {
        name: validatedData.name,
        description: validatedData.description || '',
        status: 'draft',
        workspaceId: workspace.id,
        userId: user.userId
      },
      include: {
        estimates: true,
        workspace: true
      }
    })

    return NextResponse.json({
      success: true,
      project: {
        id: project.id,
        name: project.name,
        description: project.description,
        status: project.status,
        createdAt: project.createdAt,
        workspace: project.workspace.name
      }
    })

  } catch (error) {
    console.error('Error creating project:', error)
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid input', details: error.errors },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Get user's workspace and projects
    const userWithWorkspace = await prisma.user.findUnique({
      where: { id: user.userId },
      include: {
        workspaces: {
          include: {
            workspace: {
              include: {
                projects: {
                  include: {
                    estimates: true
                  },
                  orderBy: {
                    updatedAt: 'desc'
                  }
                }
              }
            }
          }
        }
      }
    })

    if (!userWithWorkspace || !userWithWorkspace.workspaces[0]) {
      return NextResponse.json(
        { error: 'No workspace found' },
        { status: 400 }
      )
    }

    const workspace = userWithWorkspace.workspaces[0].workspace
    const projects = workspace.projects

    return NextResponse.json({
      success: true,
      projects: projects.map((project: any) => ({
        id: project.id,
        name: project.name,
        description: project.description,
        status: project.status,
        createdAt: project.createdAt,
        updatedAt: project.updatedAt,
        estimatesCount: project.estimates.length
      })),
      workspace: {
        id: workspace.id,
        name: workspace.name
      }
    })

  } catch (error) {
    console.error('Error fetching projects:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}