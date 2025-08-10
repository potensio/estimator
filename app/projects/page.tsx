import { redirect } from 'next/navigation'
import { getCurrentUser } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { ProjectCard, type Project } from "@/components/project-card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Search } from "lucide-react"
import { NewProjectDialog } from "@/components/new-project-dialog"
import { UserMenu } from "@/components/user-menu"

export default async function ProjectsPage() {
  const user = await getCurrentUser()
  
  if (!user) {
    redirect('/login')
  }

  // Get user's workspace and projects with workspace isolation
  const userWithWorkspace = await prisma.user.findUnique({
    where: { id: user.userId },
    include: {
      workspaces: {
        include: {
          workspace: {
            include: {
              projects: {
                include: {
                  estimates: true
                },
                orderBy: {
                  updatedAt: 'desc'
                }
              }
            }
          }
        }
      }
    }
  })

  if (!userWithWorkspace || !userWithWorkspace.workspaces[0]) {
    redirect('/login')
  }

  const workspace = userWithWorkspace.workspaces[0].workspace
  const projects = workspace.projects

  // Transform projects to match the expected format
  const transformedProjects: Project[] = projects.map((project: any) => ({
    id: project.id,
    title: project.name,
    company: workspace.name,
    clarity: Math.floor(Math.random() * 100), // You can implement actual clarity calculation
    status: (project.status === 'draft' ? 'Active' : 
            project.status === 'active' ? 'Active' : 
            project.status === 'completed' ? 'Completed' : 'In Progress') as Project['status'],
    date: project.createdAt.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric', 
      year: 'numeric' 
    }),
    href: `/projects/${project.id}`
  }))

  return (
    <>
      <div className="mb-6 flex items-center justify-between">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">Projects</h1>
          <p className="text-muted-foreground">
            Manage and track your project progress in {workspace.name}
          </p>
        </div>
        <UserMenu 
          user={{
            name: userWithWorkspace.name || 'User',
            email: userWithWorkspace.email
          }}
          workspace={{
            name: workspace.name
          }}
        />
      </div>

      <div className="mb-6 flex flex-col gap-3 md:mb-8 md:flex-row md:items-center md:justify-between">
        <div className="flex flex-1 items-center gap-3">
          <div className="relative w-full max-w-md">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input placeholder="Search projects..." className="pl-9" aria-label="Search projects" />
          </div>
        </div>
        <NewProjectDialog />
      </div>

      {transformedProjects.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            No projects yet
          </h3>
          <p className="text-gray-500 mb-4">
            Create your first project to get started with estimating.
          </p>
          <NewProjectDialog />
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {transformedProjects.map((project: Project) => (
            <ProjectCard key={project.id} {...project} />
          ))}
        </div>
      )}
    </>
  )
}
