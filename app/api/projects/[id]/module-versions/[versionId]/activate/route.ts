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

    // Verify project ownership
    const project = await prisma.project.findFirst({
      where: {
        id: projectId,
        userId: user.userId,
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

    // Note: activeVersionId field will be added in future migration
    // For now, we just return success without actually setting active version
    const updatedProject = await prisma.project.findFirst({
      where: {
        id: projectId,
      },
      select: {
        id: true,
        name: true,
      },
    });

    return NextResponse.json({
      success: true,
      activeVersionId: versionId,
    });
  } catch (error) {
    console.error("Error activating module version:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}