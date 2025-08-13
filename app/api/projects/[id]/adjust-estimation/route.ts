import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { calculateModuleEstimation, OptimisticLevel } from "@/lib/estimation-utils";

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const currentUser = await getCurrentUser(request);
    if (!currentUser?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const projectId = params.id;
    const body = await request.json();
    const { optimisticLevel, teamVelocity, versionId } = body;

    // Validate optimistic level
    if (!['optimistic', 'realistic', 'pessimistic'].includes(optimisticLevel)) {
      return NextResponse.json(
        { error: "Invalid optimistic level. Must be 'optimistic', 'realistic', or 'pessimistic'" },
        { status: 400 }
      );
    }

    // Validate team velocity
    if (teamVelocity && (typeof teamVelocity !== 'number' || teamVelocity <= 0)) {
      return NextResponse.json(
        { error: "Team velocity must be a positive number" },
        { status: 400 }
      );
    }

    // Get user from database
    const user = await prisma.user.findUnique({
      where: { email: currentUser.email },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Verify project ownership
    const project = await prisma.project.findFirst({
      where: {
        id: projectId,
        userId: user.id,
      },
      include: {
        moduleVersions: {
          orderBy: { version: 'desc' },
          take: 1
        }
      }
    });

    if (!project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    // Get the module version to adjust
    let moduleVersion;
    if (versionId) {
      moduleVersion = await prisma.moduleVersion.findFirst({
        where: {
          id: versionId,
          projectId: projectId
        }
      });
    } else {
      // Use the latest version if no specific version provided
      moduleVersion = project.moduleVersions[0];
    }

    if (!moduleVersion) {
      return NextResponse.json({ error: "Module version not found" }, { status: 404 });
    }

    // Calculate adjusted estimation
    const adjustedEstimation = calculateModuleEstimation(
      moduleVersion.modulesData,
      optimisticLevel as OptimisticLevel,
      teamVelocity || 20
    );

    // Get the next version number
    const latestVersion = await prisma.moduleVersion.findFirst({
      where: { projectId },
      orderBy: { version: 'desc' },
      select: { version: true }
    });

    const nextVersion = (latestVersion?.version || 0) + 1;

    // Create new module version with adjusted estimation
    const newModuleVersion = await prisma.moduleVersion.create({
      data: {
        projectId,
        version: nextVersion,
        name: `${optimisticLevel.charAt(0).toUpperCase() + optimisticLevel.slice(1)} Estimation`,
        modulesData: moduleVersion.modulesData as any, // Keep the same modules data
        ...(adjustedEstimation.totals.original_hours && { baseEstimationHours: adjustedEstimation.totals.original_hours }),
        ...(optimisticLevel && { optimisticLevel: optimisticLevel }),
        ...(adjustedEstimation.totals.adjusted_hours && { adjustedEstimationHours: adjustedEstimation.totals.adjusted_hours }),
        ...(adjustedEstimation.totals.estimated_sprints && { totalEstimatedSprints: adjustedEstimation.totals.estimated_sprints }),
        ...(teamVelocity && { teamVelocity: teamVelocity })
      }
    });

    // Update project to use the new version as active
    await prisma.project.update({
      where: { id: projectId },
      data: { activeVersionId: newModuleVersion.id }
    });

    return NextResponse.json({
      success: true,
      moduleVersion: newModuleVersion,
      estimation: adjustedEstimation,
      message: `Estimation adjusted to ${optimisticLevel} scenario`
    });

  } catch (error) {
    console.error("Error adjusting estimation:", error);
    return NextResponse.json(
      { error: "Failed to adjust estimation" },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const currentUser = await getCurrentUser(request);
    if (!currentUser?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const projectId = params.id;
    const { searchParams } = new URL(request.url);
    const versionId = searchParams.get('versionId');
    const optimisticLevel = searchParams.get('optimisticLevel') || 'realistic';
    const teamVelocity = parseInt(searchParams.get('teamVelocity') || '20');

    // Get user from database
    const user = await prisma.user.findUnique({
      where: { email: currentUser.email },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Verify project ownership
    const project = await prisma.project.findFirst({
      where: {
        id: projectId,
        userId: user.id,
      },
      include: {
        moduleVersions: {
          orderBy: { version: 'desc' },
          take: 1
        }
      }
    });

    if (!project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    // Get the module version
    let moduleVersion;
    if (versionId) {
      moduleVersion = await prisma.moduleVersion.findFirst({
        where: {
          id: versionId,
          projectId: projectId
        }
      });
    } else {
      moduleVersion = project.moduleVersions[0];
    }

    if (!moduleVersion) {
      return NextResponse.json({ error: "Module version not found" }, { status: 404 });
    }

    // Calculate estimation preview without saving
    const estimationPreview = calculateModuleEstimation(
      moduleVersion.modulesData,
      optimisticLevel as OptimisticLevel,
      teamVelocity
    );

    return NextResponse.json({
      success: true,
      moduleVersion,
      estimation: estimationPreview
    });

  } catch (error) {
    console.error("Error getting estimation preview:", error);
    return NextResponse.json(
      { error: "Failed to get estimation preview" },
      { status: 500 }
    );
  }
}