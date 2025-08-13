import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { prisma } from '@/lib/db'

// GET /api/projects/[id] - Get a single project
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser(request)
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params

    // Get user's workspace first
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
      return NextResponse.json({ error: 'No workspace found' }, { status: 400 })
    }

    const workspaceId = userWithWorkspace.workspaces[0].workspace.id

    // Get project with all related data
    const project = await prisma.project.findFirst({
      where: {
        id: id,
        workspaceId: workspaceId,
      },
      include: {
        workspace: {
          select: {
            id: true,
            name: true,
          },
        },
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        files: {
          select: {
            id: true,
            filename: true,
            fileSize: true,
            mimeType: true,
            uploadedAt: true,
          },
          orderBy: {
            uploadedAt: 'desc',
          },
        },
        estimates: true,
        moduleVersions: {
          select: {
            id: true,
            version: true,
            name: true,
            modulesData: true,
            createdAt: true,
          },
          orderBy: {
            version: 'desc',
          },
          take: 1,
        },
      },
    })

    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 })
    }

    // Transform the data to match the expected format
    const transformedProject = {
      id: project.id,
      name: project.name,
      description: project.description,
      status: project.status,
      createdAt: project.createdAt,
      updatedAt: project.updatedAt,
      workspace: project.workspace,
      user: project.user,
      files: project.files,
      estimatesCount: project.estimates.length,
      activeVersion: project.moduleVersions[0] || null,
      initialFiles: project.files.map((file) => ({
        name: file.filename,
        size: file.fileSize,
        uploadedAt: file.uploadedAt.toISOString(),
      })),
    }

    return NextResponse.json({ project: transformedProject })
  } catch (error) {
    console.error('Error fetching project:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// PUT /api/projects/[id] - Update a project
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser(request)
    
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const { id } = await params
    const body = await request.json()
    const { name, description } = body

    // Validate input
    if (!name || name.trim().length === 0) {
      return NextResponse.json(
        { error: 'Project name is required' },
        { status: 400 }
      )
    }

    // Get user's workspace first
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
      return NextResponse.json({ error: 'No workspace found' }, { status: 400 })
    }

    const workspaceId = userWithWorkspace.workspaces[0].workspace.id

    // Verify project ownership
    const existingProject = await prisma.project.findFirst({
      where: {
        id: id,
        workspaceId: workspaceId,
      },
    })

    if (!existingProject) {
      return NextResponse.json(
        { error: 'Project not found or unauthorized' },
        { status: 404 }
      )
    }

    // Update the project
    const updatedProject = await prisma.project.update({
      where: {
        id: id,
      },
      data: {
        name: name.trim(),
        description: description?.trim() || null,
        updatedAt: new Date(),
      },
    })

    return NextResponse.json({
      success: true,
      project: {
        id: updatedProject.id,
        name: updatedProject.name,
        description: updatedProject.description,
        updatedAt: updatedProject.updatedAt,
      },
    })

  } catch (error) {
    console.error('Update project error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}