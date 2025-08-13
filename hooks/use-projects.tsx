'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'

export interface Project {
  id: string
  title: string
  company: string
  clarity: number
  status: 'Active' | 'Completed' | 'In Progress'
  date: string
  href: string
}

interface ProjectsData {
  projects: Project[]
  workspaceName: string
}

export function useProjects() {
  const [data, setData] = useState<ProjectsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()

  useEffect(() => {
    async function fetchProjects() {
      try {
        setLoading(true)
        const response = await fetch('/api/projects')
        
        if (response.status === 401) {
          router.push('/login')
          return
        }
        
        if (!response.ok) {
          throw new Error('Failed to fetch projects')
        }
        
        const projectsData = await response.json()
        setData(projectsData)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An error occurred')
      } finally {
        setLoading(false)
      }
    }

    fetchProjects()
  }, [router])

  return { data, loading, error, refetch: () => setLoading(true) }
}