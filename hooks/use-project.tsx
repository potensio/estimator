'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'

// Simple in-memory cache for project data
const projectCache = new Map<string, { data: ProjectDetail; timestamp: number }>()
const CACHE_DURATION = 5 * 60 * 1000 // 5 minutes

export interface ProjectDetail {
  id: string
  name: string
  description: string | null
  status: string
  createdAt: Date
  updatedAt: Date
  workspace: {
    id: string
    name: string
  }
  user: {
    id: string
    name: string | null
    email: string
  }
  files: {
    id: string
    filename: string
    fileSize: number
    mimeType: string
    uploadedAt: Date
  }[]
  estimatesCount: number
  activeVersion?: {
    id: string
    version: number
    name: string | null
    modulesData: any
    createdAt: Date
  } | null
  initialFiles: {
    name: string
    size: number
    uploadedAt: string
  }[]
}

export function useProject(projectId: string) {
  const [project, setProject] = useState<ProjectDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()
  const abortControllerRef = useRef<AbortController | null>(null)

  useEffect(() => {
    async function fetchProject() {
      if (!projectId) {
        setLoading(false)
        return
      }

      try {
        setLoading(true)
        setError(null)
        
        // Check cache first
        const cached = projectCache.get(projectId)
        if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
          setProject(cached.data)
          setLoading(false)
          return
        }
        
        // Cancel previous request if still pending
        if (abortControllerRef.current) {
          abortControllerRef.current.abort()
        }
        
        abortControllerRef.current = new AbortController()
        
        const response = await fetch(`/api/projects/${projectId}`, {
          signal: abortControllerRef.current.signal
        })
        
        if (response.status === 401) {
          setError('Unauthorized access')
          return
        }
        
        if (response.status === 404) {
          setError('Project not found')
          return
        }
        
        if (!response.ok) {
          throw new Error('Failed to fetch project')
        }
        
        const data = await response.json()
        const projectData = data.project
        
        // Cache the result
        projectCache.set(projectId, {
          data: projectData,
          timestamp: Date.now()
        })
        
        setProject(projectData)
      } catch (err) {
        if (err instanceof Error && err.name === 'AbortError') {
          // Request was aborted, ignore
          return
        }
        setError(err instanceof Error ? err.message : 'An error occurred')
      } finally {
        setLoading(false)
      }
    }

    fetchProject()
    
    // Cleanup function
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort()
      }
    }
  }, [projectId, router])

  const refetch = () => {
    // Clear cache for this project and refetch
    projectCache.delete(projectId)
    setLoading(true)
  }

  return { project, loading, error, refetch }
}