import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";

// GET /api/projects/[id]/module-versions - Get all versions for a project
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser(request);
    if (!user?.userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: projectId } = await params;

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

    // Verify project ownership and get active version
    const project = await prisma.project.findFirst({
      where: {
        id: projectId,
        workspaceId: workspaceId,
      },
      select: {
        id: true,
        name: true,
        activeVersionId: true,
      },
    });

    if (!project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    // Get all module versions for this project
    const versions = await prisma.moduleVersion.findMany({
      where: {
        projectId: projectId,
      },
      orderBy: {
        version: 'desc',
      },
      select: {
        id: true,
        version: true,
        name: true,
        createdAt: true,
        modulesData: true,
      },
    });

    return NextResponse.json({
      versions,
      activeVersionId: project.activeVersionId,
    });
  } catch (error) {
    console.error("Error fetching module versions:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// POST /api/projects/[id]/module-versions - Create a new version
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser(request);
    if (!user?.userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: projectId } = await params;
    const { modulesData, name } = await request.json();

    if (!modulesData) {
      return NextResponse.json(
        { error: "modulesData is required" },
        { status: 400 }
      );
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
    const project = await prisma.project.findFirst({
      where: {
        id: projectId,
        workspaceId: workspaceId,
      },
    });

    if (!project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    // Get the next version number
    const lastVersion = await prisma.moduleVersion.findFirst({
      where: { projectId },
      orderBy: { version: 'desc' },
      select: { version: true },
    });

    const nextVersion = (lastVersion?.version || 0) + 1;

    // Create new version
    const newVersion = await prisma.moduleVersion.create({
      data: {
        projectId,
        version: nextVersion,
        name: name || `Version ${nextVersion}`,
        modulesData,
      },
    });

    // Update project to set this as the active version
    await prisma.project.update({
      where: { id: projectId },
      data: { activeVersionId: newVersion.id },
    });

    return NextResponse.json({
      success: true,
      version: newVersion,
    });
  } catch (error) {
    console.error("Error creating module version:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}