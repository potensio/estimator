'use client'

import { useState, useMemo } from 'react'
import { ProjectCard, type Project } from "@/components/project-card"
import { Input } from "@/components/ui/input"
import { Search } from "lucide-react"
import { NewProjectDialog } from "@/components/new-project-dialog"

interface ProjectsClientProps {
  projects: Project[]
  workspaceName: string
  onRefresh?: () => void
}

export function ProjectsClient({ projects, workspaceName, onRefresh }: ProjectsClientProps) {
  const [searchTerm, setSearchTerm] = useState('')

  const filteredProjects = useMemo(() => {
    if (!searchTerm.trim()) {
      return projects
    }

    const searchTermLower = searchTerm.toLowerCase().trim()
    return projects.filter(project => 
      project.title.toLowerCase().includes(searchTermLower) ||
      project.status.toLowerCase().includes(searchTermLower) ||
      project.company.toLowerCase().includes(searchTermLower)
    )
  }, [projects, searchTerm])

  return (
    <>
      <div className="mb-6 flex items-center justify-between">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">Projects</h1>
          <p className="text-muted-foreground">
            Manage and track your project progress in {workspaceName}
          </p>
        </div>
      </div>

      <div className="mb-6 flex flex-col gap-3 md:mb-8 md:flex-row md:items-center md:justify-between">
        <div className="flex flex-1 items-center gap-3">
          <div className="relative w-full max-w-md">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input 
              placeholder="Search projects..." 
              className="pl-9" 
              aria-label="Search projects"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>
        <NewProjectDialog />
      </div>

      {projects.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            No projects yet
          </h3>
          <p className="text-gray-500 mb-4">
            Create your first project to get started with estimating.
          </p>
          <NewProjectDialog />
        </div>
      ) : filteredProjects.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            No projects found
          </h3>
          <p className="text-gray-500 mb-4">
            Try adjusting your search term or create a new project.
          </p>
          <NewProjectDialog />
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredProjects.map((project: Project) => (
            <ProjectCard key={project.id} {...project} onRefresh={onRefresh} />
          ))}
        </div>
      )}
    </>
  )
}