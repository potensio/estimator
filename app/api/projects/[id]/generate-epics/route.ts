import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { generateModulesWithOpenAI, uploadFileToOpenAI } from "@/lib/blob";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser(request);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

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

    // Verify project ownership using workspace validation and get files
    const project = await prisma.project.findFirst({
      where: {
        id: id,
        workspaceId: workspaceId,
      },
      include: {
        files: true,
      },
    });

    if (!project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    if (project.files.length === 0) {
      return NextResponse.json(
        { error: "No files uploaded for epic generation" },
        { status: 400 }
      );
    }

    // Upload files to OpenAI and get file IDs
    const fileIds: string[] = [];

    for (const file of project.files) {
      try {
        // Upload file to OpenAI and get file ID
        const fileId = await uploadFileToOpenAI(file.filePath, file.filename);
        fileIds.push(fileId);
      } catch (error) {
        console.error(
          `Error uploading file ${file.filename} to OpenAI:`,
          error
        );
        // Continue with other files
      }
    }

    if (fileIds.length === 0) {
      return NextResponse.json(
        { error: "Failed to upload files to OpenAI" },
        { status: 500 }
      );
    }

    // Generate modules and features using OpenAI
    const modulesData = await generateModulesWithOpenAI(
      project.name,
      project.description || "",
      fileIds
    );

    // Get the next version number
    const lastVersion = await prisma.moduleVersion.findFirst({
      where: { projectId: id },
      orderBy: { version: 'desc' },
      select: { version: true },
    });

    const nextVersion = (lastVersion?.version || 0) + 1;
    const versionName = `Generated ${new Date().toLocaleString()}`;

    // Save generated modules directly to database
    const newVersion = await prisma.moduleVersion.create({
      data: {
        projectId: id,
        version: nextVersion,
        name: versionName,
        modulesData,
      },
    });

    // Update project to set this as the active version
    await prisma.project.update({
      where: { id },
      data: { activeVersionId: newVersion.id },
    });

    console.log('Generated modules saved to database:', {
      versionId: newVersion.id,
      version: newVersion.version,
      name: newVersion.name,
      dataSize: JSON.stringify(modulesData).length,
      setAsActive: true
    });

    return NextResponse.json({
      success: true,
      modules: modulesData,
      version: newVersion,
      message: `Modules generated and saved as ${versionName}`
    });
  } catch (error) {
    console.error("Epic generation error:", error);
    return NextResponse.json(
      {
        error: "Epic generation failed",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
