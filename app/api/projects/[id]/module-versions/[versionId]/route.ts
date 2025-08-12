import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";

// PUT /api/projects/[id]/module-versions/[versionId] - Update a specific version
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
    const { modulesData } = await request.json();

    if (!modulesData) {
      return NextResponse.json(
        { error: "modulesData is required" },
        { status: 400 }
      );
    }

    // Verify project ownership and version exists
    const version = await prisma.moduleVersion.findFirst({
      where: {
        id: versionId,
        projectId: projectId,
        project: {
          userId: user.userId,
        },
      },
    });

    if (!version) {
      return NextResponse.json(
        { error: "Version not found or unauthorized" },
        { status: 404 }
      );
    }

    // Update the version
    const updatedVersion = await prisma.moduleVersion.update({
      where: {
        id: versionId,
      },
      data: {
        modulesData,
      },
    });

    return NextResponse.json({
      success: true,
      version: updatedVersion,
    });
  } catch (error) {
    console.error("Error updating module version:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}