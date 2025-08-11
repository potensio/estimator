import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { uploadToBlob, deleteFromBlob, uploadFileToOpenAI, deleteOpenAIFile } from "@/lib/blob";

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

    // Verify project ownership
    const project = await prisma.project.findFirst({
    where: {
      id: id,
      userId: user.userId,
    },
  });

    if (!project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    const formData = await request.formData();
    const file = formData.get("file") as File;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    // Validate file type
    const allowedTypes = [
      "application/pdf",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "application/msword",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "application/vnd.ms-excel",
      "text/plain",
    ];

    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json(
        { error: "File type not supported" },
        { status: 400 }
      );
    }

    // Generate unique filename
    const timestamp = Date.now();
    const filename = `${timestamp}-${file.name}`;

    // Upload file to Vercel Blob
    const blobResult = await uploadToBlob(file, filename);

    // Upload to OpenAI for RAG
    let openaiFileId: string | null = null;
    try {
      openaiFileId = await uploadFileToOpenAI(blobResult.url, file.name);
    } catch (error) {
      console.error('Failed to upload to OpenAI:', error);
      // Continue without OpenAI upload - file is still saved to blob
    }

    // Save file metadata to database
    const projectFile = await prisma.projectFile.create({
      data: {
        filename: filename,
        originalName: file.name,
        fileSize: file.size,
        mimeType: file.type,
        filePath: blobResult.url,
        projectId: id,
        openaiFileId: openaiFileId,
      },
    });

    return NextResponse.json({
      success: true,
      file: {
        id: projectFile.id,
        name: projectFile.originalName,
        size: projectFile.fileSize,
        uploadedAt: projectFile.uploadedAt,
      },
    });
  } catch (error) {
    console.error("File upload error:", error);
    return NextResponse.json(
      { error: "Failed to upload file" },
      { status: 500 }
    );
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    // Verify project ownership
    const project = await prisma.project.findFirst({
      where: {
        id: id,
        userId: user.userId,
      },
    });

    if (!project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    // Get all files for this project
    const files = await prisma.projectFile.findMany({
      where: {
        projectId: id,
      },
      orderBy: {
        uploadedAt: "desc",
      },
    });

    return NextResponse.json({
       files: files.map((file: any) => ({
         id: file.id,
         name: file.originalName || file.name,
         size: file.fileSize || file.size,
         uploadedAt: file.uploadedAt || file.createdAt,
         filePath: file.filePath,
       })),
     });
  } catch (error) {
    console.error("Error fetching files:", error);
    return NextResponse.json(
      { error: "Failed to fetch files" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const { searchParams } = new URL(request.url);
    const fileId = searchParams.get("fileId");

    if (!fileId) {
      return NextResponse.json({ error: "File ID required" }, { status: 400 });
    }

    // Verify project ownership
    const project = await prisma.project.findFirst({
      where: {
        id: id,
        userId: user.userId,
      },
    });

    if (!project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    // Get file info
    const file = await prisma.projectFile.findFirst({
      where: {
        id: fileId,
        projectId: id,
      },
    });

    if (!file) {
      return NextResponse.json({ error: "File not found" }, { status: 404 });
    }

    // Delete file from Vercel Blob
    try {
      await deleteFromBlob(file.filePath);
    } catch (error) {
      console.warn("Could not delete file from blob storage:", error);
    }

    // Delete from OpenAI if exists
    if (file.openaiFileId) {
      try {
        await deleteOpenAIFile(file.openaiFileId);
      } catch (error) {
        console.error("Error deleting from OpenAI:", error);
        // Continue with database deletion even if OpenAI deletion fails
      }
    }

    // Delete file record from database
    await prisma.projectFile.delete({
      where: {
        id: fileId,
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting file:", error);
    return NextResponse.json(
      { error: "Failed to delete file" },
      { status: 500 }
    );
  }
}
