import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { generateModulesWithOpenAI, uploadFileToOpenAI } from "@/lib/blob";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    // Verify project ownership and get files
    const project = await prisma.project.findFirst({
      where: {
        id: id,
        userId: user.userId,
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

    return NextResponse.json({
      success: true,
      modules: modulesData,
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