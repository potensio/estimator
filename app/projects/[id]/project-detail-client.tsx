'use client'

import { use } from 'react'
import { Button } from "@/components/ui/button"
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  AlertCircle,
  ChevronRight,
  FileText,
  BarChart3,
  Code,
  Calculator,
} from "lucide-react"

import { JsonEditor } from "@/components/json-editor"
import Link from "next/link"
import { ProjectUploader } from "@/components/project-uploader"
import { ProjectAnalysis } from "@/components/project-analysis"
import { EditProjectDialog } from "@/components/edit-project-dialog"
import { TShirtEstimation } from "@/components/tshirt-estimation"
import { useProject } from "@/hooks/use-project"
import { Alert, AlertDescription } from "@/components/ui/alert"

interface ProjectDetailClientProps {
  params: Promise<{ id: string }>
}

export function ProjectDetailClient({ params }: ProjectDetailClientProps) {
  const { id } = use(params)
  const { project, loading, error } = useProject(id)

  if (loading) {
    // This will be handled by Suspense, but just in case
    return null
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          {error}
        </AlertDescription>
      </Alert>
    )
  }

  if (!project) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          Project not found
        </AlertDescription>
      </Alert>
    )
  }

  const title = project.name

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
          <ProjectUploader projectId={project.id} initialFiles={project.initialFiles} />
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
          <TShirtEstimation 
            projectId={project.id} 
            moduleVersion={project.activeVersion}
          />
        </TabsContent>
      </Tabs>
    </div>
  )
}