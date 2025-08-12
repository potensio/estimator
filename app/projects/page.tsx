import { redirect } from 'next/navigation'
import { getCurrentUser } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { ProjectsClient } from './projects-client'


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
                  estimates: true,
                  analysis: true
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
  const transformedProjects = projects.map((project: any) => ({
    id: project.id,
    title: project.name,
    company: workspace.name,
    clarity: project.analysis?.overallClarity || 0, // Use real clarity from analysis
    status: (project.status === 'draft' ? 'Active' : 
            project.status === 'active' ? 'Active' : 
            project.status === 'completed' ? 'Completed' : 'In Progress') as 'Active' | 'Completed' | 'In Progress',
    date: project.createdAt.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric', 
      year: 'numeric' 
    }),
    href: `/projects/${project.id}`
  }))

  return <ProjectsClient projects={transformedProjects} workspaceName={workspace.name} />
}
