import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import {
  readBlobContent,
  analyzeProjectWithOpenAI,
  uploadFileToOpenAI,
} from "@/lib/blob";
import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const REQUIREMENTS_CHECKLIST = {
  functional: [
    "User roles and permissions",
    "Core features and functionality",
    "Integration requirements",
  ],
  business: ["Target users and personas", "Business objectives and goals"],
  userExperience: ["User interface requirements", "Device requirements"],
  scope: [
    "Project timeline and phases",
    "Risk factors",
    "Dependencies and assumptions",
  ],
};

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

    // Verify project ownership and get files
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
        { error: "No files uploaded for analysis" },
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

    // Use the new OpenAI analysis function with file IDs
    const analysisData = await analyzeProjectWithOpenAI(
      project.name,
      project.description || "",
      fileIds,
      REQUIREMENTS_CHECKLIST
    );

    // Save analysis to database (upsert to handle re-analysis)
    const savedAnalysis = await prisma.projectAnalysis.upsert({
      where: {
        projectId: id,
      },
      update: {
        functionalCoverage: analysisData.functionalCoverage || 0,
        businessCoverage: analysisData.businessCoverage || 0,
        userExperienceCoverage: analysisData.userExperienceCoverage || 0,
        scopeCoverage: analysisData.scopeCoverage || 0,
        overallClarity: analysisData.overallClarity || 0,
        missingItems: analysisData.missingItems || [],
        projectSummary: analysisData.projectSummary || null,
        analyzedAt: new Date(),
      },
      create: {
        projectId: id,
        functionalCoverage: analysisData.functionalCoverage || 0,
        businessCoverage: analysisData.businessCoverage || 0,
        userExperienceCoverage: analysisData.userExperienceCoverage || 0,
        scopeCoverage: analysisData.scopeCoverage || 0,
        overallClarity: analysisData.overallClarity || 0,
        missingItems: analysisData.missingItems || [],
        projectSummary: analysisData.projectSummary || null,
        analyzedAt: new Date(),
      },
    });

    return NextResponse.json({
      success: true,
      analysis: {
        id: savedAnalysis.id,
        functionalCoverage: savedAnalysis.functionalCoverage,
        businessCoverage: savedAnalysis.businessCoverage,
        userExperienceCoverage: savedAnalysis.userExperienceCoverage,
        scopeCoverage: savedAnalysis.scopeCoverage,
        overallClarity: savedAnalysis.overallClarity,
        missingItems: savedAnalysis.missingItems,
        summary: savedAnalysis.projectSummary || "",
        analyzedAt: savedAnalysis.analyzedAt,
      },
    });
  } catch (error) {
    console.error("Analysis error:", error);
    return NextResponse.json(
      {
        error: "Analysis failed",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

export async function GET(
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

    // Verify project ownership and get latest analysis
    const project = await prisma.project.findFirst({
      where: {
        id: id,
        workspaceId: workspaceId,
      },
      include: {
        analysis: true,
      },
    });

    if (!project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    const analysis = project.analysis;
    if (!analysis) {
      return NextResponse.json({ analysis: null });
    }

    return NextResponse.json({
      analysis: {
        id: analysis.id,
        functionalCoverage: analysis.functionalCoverage,
        businessCoverage: analysis.businessCoverage,
        userExperienceCoverage: analysis.userExperienceCoverage,
        scopeCoverage: analysis.scopeCoverage,
        overallClarity: analysis.overallClarity,
        missingItems: analysis.missingItems,
        summary: analysis.projectSummary,
        analyzedAt: analysis.analyzedAt,
      },
    });
  } catch (error) {
    console.error("Get analysis error:", error);
    return NextResponse.json(
      { error: "Failed to get analysis" },
      { status: 500 }
    );
  }
}
