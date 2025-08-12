import type React from "react"
import { TopNav } from "@/components/top-nav"
import { getCurrentUser } from "@/lib/auth"
import { prisma } from "@/lib/db"
import { redirect } from "next/navigation"

export default async function ProjectsLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser()
  
  if (!user) {
    redirect('/login')
  }

  // Get user's workspace
  const userWithWorkspace = await prisma.user.findUnique({
    where: { id: user.userId },
    include: {
      workspaces: {
        include: {
          workspace: {
            select: {
              id: true,
              name: true,
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
  const userData = {
    name: userWithWorkspace.name || 'User',
    email: userWithWorkspace.email
  }

  return (
    <div className="min-h-svh bg-background">
      <TopNav user={userData} workspace={workspace} />
      <main className="mx-auto px-4 py-6 sm:px-6 sm:py-8 lg:px-8 xl:max-w-7xl">{children}</main>
    </div>
  )
}
