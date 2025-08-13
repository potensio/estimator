import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";

// PUT /api/projects/[id]/module-versions/[versionId]/activate - Set a version as active
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; versionId: string }> }
) {
  try {
    const user = await getCurrentUser(request);
    if (!user?.userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: projectId, versionId } = await params;

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

    // Verify project ownership using workspace validation
    const project = await prisma.project.findFirst({
      where: {
        id: projectId,
        workspaceId: workspaceId,
      },
    });

    if (!project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    // Verify the version exists and belongs to this project
    const version = await prisma.moduleVersion.findFirst({
      where: {
        id: versionId,
        projectId: projectId,
      },
    });

    if (!version) {
      return NextResponse.json({ error: "Version not found" }, { status: 404 });
    }

    // Update the project to set the active version
    await prisma.project.update({
      where: { id: projectId },
      data: { activeVersionId: versionId },
    });

    return NextResponse.json({
      success: true,
      activeVersionId: versionId,
      message: `Activated version ${version.version}`,
    });
  } catch (error) {
    console.error("Error activating module version:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}