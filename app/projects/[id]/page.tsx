import { Button } from "@/components/ui/button";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  AlertCircle,
  Edit,
  RefreshCcw,
  ChevronRight,
  FileText,
  BarChart3,
  Code,
  Calculator,
} from "lucide-react";

import { JsonEditor } from "@/components/json-editor";
import Link from "next/link";
import { ProjectUploader } from "@/components/project-uploader";
import { ProjectAnalysis } from "@/components/project-analysis";
import { EditProjectDialog } from "@/components/edit-project-dialog";
import { FibonacciEstimation } from "@/components/fibonacci-estimation";

import { getCurrentUser } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { PrismaClient } from "@prisma/client";

type Project = {
  id: string;
  name: string;
  description: string | null;
  status: string;
  createdAt: Date;
  updatedAt: Date;
  workspace: {
    id: string;
    name: string;
  };
  user: {
    id: string;
    name: string | null;
    email: string;
  };
  files: {
    id: string;
    filename: string;
    fileSize: number;
    mimeType: string;
    uploadedAt: Date;
  }[];
  estimatesCount: number;
  activeVersion?: {
    id: string;
    version: number;
    name: string | null;
    modulesData: any;
    createdAt: Date;
  } | null;
};

async function getProject(id: string, userId: string): Promise<Project | null> {
  try {
    // First, get user's workspace to ensure proper access control
    const userWithWorkspace = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        workspaces: {
          include: {
            workspace: {
              include: {
                projects: {
                  where: { id },
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
                    },
                    _count: {
                      select: {
                        estimates: true,
                      },
                    },
                    activeVersion: {
                      select: {
                        id: true,
                        version: true,
                        name: true,
                        modulesData: true,
                        createdAt: true,
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!userWithWorkspace || !userWithWorkspace.workspaces[0]) {
      return null;
    }

    const workspace = userWithWorkspace.workspaces[0].workspace;
    const project = workspace.projects.find(p => p.id === id);

    if (!project) {
      return null;
    }

    return {
      ...project,
      estimatesCount: project._count.estimates,
      activeVersion: project.activeVersion,
    };
  } catch (error) {
    console.error("Error fetching project:", error);
    return null;
  }
}

export default async function ProjectDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  const { id } = await params;
  const project = await getProject(id, user.userId);

  if (!project) {
    redirect("/projects");
  }

  const title = project.name;

  // Map actual project files to initialFiles format
  const initialFiles = project.files.map((file) => ({
    name: file.filename,
    size: file.fileSize,
    uploadedAt: file.uploadedAt.toISOString(),
  }));

  return (
    <div className="space-y-6 sm:space-y-8">
      {/* Breadcrumb */}
      <div className="flex flex-col gap-3">
        <Breadcrumb>
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbLink asChild>
                <Link href="/projects">Projects</Link>
              </BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator>
              <ChevronRight className="h-4 w-4" />
            </BreadcrumbSeparator>
            <BreadcrumbItem>
              <BreadcrumbPage>{title}</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>

        {/* Header */}
        <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
              {title}
            </h1>
            {project.description && (
              <p className="text-muted-foreground">
                Client: {project.description}
              </p>
            )}
          </div>
          <div className="flex items-center gap-2">
            <EditProjectDialog 
              projectId={project.id}
              currentName={project.name}
              currentDescription={project.description || undefined}
            />
          </div>
        </div>
      </div>

      {/* Content */}
      <Tabs defaultValue="documents" className="w-full">
        <TabsList className="grid w-full md:w-fit grid-cols-4">
          <TabsTrigger value="documents" className="flex items-center gap-2">
            <FileText className="h-4 w-4" />
            Documents
          </TabsTrigger>
          <TabsTrigger value="analysis" className="flex items-center gap-2">
            <BarChart3 className="h-4 w-4" />
            Project Analysis
          </TabsTrigger>
          <TabsTrigger value="epics" className="flex items-center gap-2">
            <Code className="h-4 w-4" />
            Epics & Stories
          </TabsTrigger>
          <TabsTrigger value="estimation" className="flex items-center gap-2">
            <Calculator className="h-4 w-4" />
            Estimation
          </TabsTrigger>
        </TabsList>

        <TabsContent value="documents" className="mt-6">
          <ProjectUploader projectId={project.id} initialFiles={initialFiles} />
        </TabsContent>

        <TabsContent value="analysis" className="mt-6">
          <ProjectAnalysis
            projectId={project.id}
            hasFiles={project.files && project.files.length > 0}
          />
        </TabsContent>

        <TabsContent value="epics" className="mt-6">
          <div className="space-y-6">
            <JsonEditor projectId={project.id} data={{}} />
          </div>
        </TabsContent>

        <TabsContent value="estimation" className="mt-6">
          <FibonacciEstimation 
            projectId={project.id} 
            moduleVersion={project.activeVersion}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
