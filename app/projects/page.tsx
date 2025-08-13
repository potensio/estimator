'use client'

import { useEffect, useState } from 'react'
import { useAuth } from '@/lib/client-auth'
import { useRouter } from 'next/navigation'
import { ProjectsClient } from './projects-client'
import { ProjectsSkeleton } from '@/components/projects-skeleton'

interface Project {
  id: string
  title: string
  company: string
  clarity: number
  status: 'Active' | 'In Progress' | 'Completed' | 'On Hold'
  date: string
  href?: string
}

export default function ProjectsPage() {
  const { user, loading } = useAuth()
  const router = useRouter()
  const [projects, setProjects] = useState<Project[]>([])
  const [projectsLoading, setProjectsLoading] = useState(true)
  const [workspaceName, setWorkspaceName] = useState('')
  const [refreshTrigger, setRefreshTrigger] = useState(0)

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login')
      return
    }

    if (user) {
      fetchProjects()
    }
  }, [user, loading, router, refreshTrigger])

  const fetchProjects = async () => {
    try {
      const response = await fetch('/api/projects')
      
      if (response.status === 401) {
        router.push('/login')
        return
      }
      
      if (response.ok) {
        const data = await response.json()
        setProjects(data.projects)
        setWorkspaceName(data.workspaceName)
      } else {
        console.error('Failed to fetch projects')
      }
    } catch (error) {
      console.error('Failed to fetch projects:', error)
    } finally {
      setProjectsLoading(false)
    }
  }

  const refreshProjects = () => {
    setRefreshTrigger(prev => prev + 1)
  }

  if (loading || projectsLoading) {
    return <ProjectsSkeleton />
  }

  if (!user) {
    return null // Will redirect
  }

  return (
    <ProjectsClient 
      projects={projects} 
      workspaceName={workspaceName}
      onRefresh={refreshProjects}
    />
  )
}
