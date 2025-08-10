import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb"
import { AlertCircle, Edit, RefreshCcw, ChevronRight } from "lucide-react"
import Link from "next/link"
import { ProjectUploader } from "@/components/project-uploader"

function formatTitleFromId(id: string) {
  if (/^\d+$/.test(id)) return `Project ${id}`
  return id.replace(/[-_]+/g, " ").replace(/\b\w/g, (m) => m.toUpperCase())
}

export default function ProjectDetailPage({ params }: { params: { id: string } }) {
  const title = formatTitleFromId(params.id)

  // Seed files (UI only)
  const initialFiles = [
    {
      name: "Requirements Document.pdf",
      size: 2.4 * 1024 * 1024,
      uploadedAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
    },
    {
      name: "Technical Specifications.docx",
      size: 1.8 * 1024 * 1024,
      uploadedAt: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString(),
    },
    {
      name: "Project Timeline.xlsx",
      size: 956 * 1024,
      uploadedAt: new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString(),
    },
  ]

  const metrics = [
    { label: "Functional Requirements", value: 85 },
    { label: "Technical Scope", value: 60 },
    { label: "Data & Storage", value: 30 },
    { label: "Non-Functional", value: 70 },
  ]

  const missing = [
    "Database type not specified",
    "Authentication method unclear",
    "Performance requirements missing",
    "Third-party integrations unknown",
  ]

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
            <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">{title}</h1>
            <p className="text-muted-foreground">Created on January 15, 2025</p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline">
              <Edit className="mr-2 h-4 w-4" />
              Edit Project
            </Button>
            <Button>Analyze Project</Button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3 xl:gap-8">
        {/* Left column with uploader and list (client) */}
        <div className="space-y-6 lg:col-span-2 xl:space-y-8">
          <ProjectUploader initialFiles={initialFiles} />
        </div>

        {/* Right sidebar */}
        <div className="space-y-6 xl:space-y-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0">
              <div>
                <CardTitle>Analysis Results</CardTitle>
                <CardDescription>Last analyzed: 2 hours ago • Documents: 3 files</CardDescription>
              </div>
              <Button variant="outline" size="sm">
                <RefreshCcw className="mr-2 h-4 w-4" />
                Re-analyze
              </Button>
            </CardHeader>
            <CardContent className="space-y-5">
              {metrics.map((m) => (
                <div key={m.label} className="space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <AlertCircle className="h-3.5 w-3.5 text-muted-foreground" />
                      <span className="font-medium">{m.label}</span>
                    </div>
                    <span className="font-medium">{m.value}%</span>
                  </div>
                  <Progress value={m.value} className="h-2 rounded-full" />
                </div>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Missing Information</CardTitle>
              <CardDescription>{missing.length} items</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {missing.map((item, idx) => (
                <div key={idx} className="flex items-start gap-3 rounded-lg border p-3">
                  <div className="mt-0.5 h-2.5 w-2.5 shrink-0 rounded-full bg-muted-foreground/40" />
                  <div className="flex-1 text-sm">{item}</div>
                  <AlertCircle className="h-4 w-4 text-muted-foreground" />
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
