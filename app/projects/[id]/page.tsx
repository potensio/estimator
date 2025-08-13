"use client";

import { useEffect, useState, useTransition } from "react";
import { useAuth } from "@/lib/client-auth";
import { useRouter } from "next/navigation";
import { useProject } from "@/hooks/use-project";
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
import { Alert, AlertDescription } from "@/components/ui/alert";
import { JsonEditor } from "@/components/json-editor";
import Link from "next/link";
import { ProjectUploader } from "@/components/project-uploader";
import { ProjectAnalysis } from "@/components/project-analysis";
import { EditProjectDialog } from "@/components/edit-project-dialog";
import { TShirtEstimation } from "@/components/tshirt-estimation";
import { Skeleton } from "@/components/ui/skeleton";

export default function ProjectDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [projectId, setProjectId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState("documents");
  const [isPending, startTransition] = useTransition();
  const [isRedirecting, setIsRedirecting] = useState(false);

  // Extract project ID from params
  useEffect(() => {
    params.then(({ id }) => setProjectId(id));
  }, [params]);

  // Always call useProject hook to maintain consistent hook order
  const {
    project,
    loading: projectLoading,
    error,
  } = useProject(projectId || "");

  // Handle authentication
  useEffect(() => {
    if (!authLoading && !user && !isRedirecting) {
      console.log("Redirecting to login due to no user");
      setIsRedirecting(true);
      router.push("/login");
    }
  }, [user, authLoading, router, isRedirecting]);

  // Handle errors with appropriate redirects (debounced)
  useEffect(() => {
    if (error && !authLoading && !projectLoading && !isRedirecting) {
      console.log("Project detail error detected:", error);
      setIsRedirecting(true);
      const timeoutId = setTimeout(() => {
        if (error === "Unauthorized access") {
          console.log("Redirecting to login due to unauthorized access");
          router.push("/login");
        } else if (error === "Project not found") {
          console.log("Redirecting to projects due to project not found");
          router.push("/projects");
        }
      }, 100); // Small delay to prevent race conditions

      return () => clearTimeout(timeoutId);
    }
  }, [error, router, authLoading, projectLoading, isRedirecting]);

  const handleTabChange = (value: string) => {
    startTransition(() => {
      setActiveTab(value);
    });
  };

  // Show loading state with skeleton
  if (authLoading || projectLoading || !projectId) {
    return (
      <div className="space-y-6 sm:space-y-8">
        {/* Breadcrumb skeleton */}
        <div className="flex flex-col gap-3">
          <Skeleton className="h-4 w-48" />
          <div className="flex items-center justify-between">
            <Skeleton className="h-8 w-64" />
            <Skeleton className="h-9 w-20" />
          </div>
        </div>

        {/* Tabs skeleton */}
        <div className="space-y-4">
          <div className="flex space-x-1">
            <Skeleton className="h-10 w-20" />
            <Skeleton className="h-10 w-24" />
            <Skeleton className="h-10 w-20" />
            <Skeleton className="h-10 w-28" />
          </div>

          {/* Content skeleton */}
          <div className="space-y-4">
            <Skeleton className="h-32 w-full" />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Skeleton className="h-24 w-full" />
              <Skeleton className="h-24 w-full" />
            </div>
            <Skeleton className="h-48 w-full" />
          </div>
        </div>
      </div>
    );
  }

  // Handle errors
  if (error) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    );
  }

  // Handle project not found
  if (!project && !projectLoading && !authLoading && projectId) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>Project not found</AlertDescription>
      </Alert>
    );
  }

  // Don't render if project is not loaded yet
  if (!project) {
    return null;
  }

  const title = project.name;

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
      <Tabs
        value={activeTab}
        onValueChange={handleTabChange}
        className="w-full"
      >
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
          {isPending && activeTab === "documents" ? (
            <div className="space-y-4">
              <Skeleton className="h-32 w-full" />
              <Skeleton className="h-24 w-full" />
            </div>
          ) : activeTab === "documents" ? (
            <ProjectUploader
              projectId={project.id}
              initialFiles={project.initialFiles}
            />
          ) : null}
        </TabsContent>

        <TabsContent value="analysis" className="mt-6">
          {isPending && activeTab === "analysis" ? (
            <div className="space-y-4">
              <Skeleton className="h-32 w-full" />
              <Skeleton className="h-48 w-full" />
            </div>
          ) : activeTab === "analysis" ? (
            <ProjectAnalysis
              projectId={project.id}
              hasFiles={project.files && project.files.length > 0}
            />
          ) : null}
        </TabsContent>

        <TabsContent value="epics" className="mt-6">
          {isPending && activeTab === "epics" ? (
            <div className="space-y-4">
              <Skeleton className="h-64 w-full" />
            </div>
          ) : activeTab === "epics" ? (
            <div className="space-y-6">
              <JsonEditor projectId={project.id} data={{}} />
            </div>
          ) : null}
        </TabsContent>

        <TabsContent value="estimation" className="mt-6">
          {isPending && activeTab === "estimation" ? (
            <div className="space-y-4">
              <Skeleton className="h-40 w-full" />
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Skeleton className="h-32 w-full" />
                <Skeleton className="h-32 w-full" />
              </div>
            </div>
          ) : activeTab === "estimation" ? (
            <TShirtEstimation
              projectId={project.id}
              moduleVersion={project.activeVersion}
            />
          ) : null}
        </TabsContent>
      </Tabs>
    </div>
  );
}
