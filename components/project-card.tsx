"use client"

import { useState, useCallback } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { MoreHorizontal } from "lucide-react"
import { useToast } from "@/hooks/use-toast"

type Status = "Active" | "In Progress" | "Completed" | "On Hold"

export type Project = {
  id: string
  title: string
  company: string
  clarity: number
  status: Status
  date: string
  href?: string
  onRefresh?: () => void
}

export function ProjectCard({ id, title, company, clarity, status, date, href, onRefresh }: Project) {
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const router = useRouter()
  const { toast } = useToast()

  // Prefetch project data on hover
  const handlePrefetch = useCallback(() => {
    if (href && id) {
      // Prefetch the project data
      fetch(`/api/projects/${id}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      }).catch(() => {
        // Silently ignore prefetch errors
      })
    }
  }, [id, href])

  const badge =
    status === "Completed"
      ? { variant: "secondary", label: "Completed" }
      : status === "In Progress"
        ? { variant: "outline", label: "In Progress" }
        : status === "On Hold"
          ? { variant: "secondary", label: "On Hold" }
          : { variant: "secondary", label: "Active" }

  const handleDelete = async () => {
    try {
      setIsDeleting(true)
      const response = await fetch(`/api/projects?projectId=${id}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        throw new Error('Failed to delete project')
      }

      toast({
        title: "Project deleted",
        description: "The project has been successfully deleted.",
      })

      // Refresh the project list
      if (onRefresh) {
        onRefresh()
      } else {
        router.refresh()
      }
    } catch (error) {
      console.error('Error deleting project:', error)
      toast({
        title: "Error",
        description: "Failed to delete project. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsDeleting(false)
      setDeleteDialogOpen(false)
    }
  }

  const content = (
    <>
      <CardHeader className="flex flex-row items-start justify-between space-y-0">
        <div className="space-y-1">
          <CardTitle className="text-base">{title}</CardTitle>
          <p className="text-sm text-muted-foreground">{company}</p>
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              aria-label="Open menu"
              onClick={(e) => {
                e.preventDefault()
                e.stopPropagation()
              }}
              onKeyDown={(e) => {
                e.stopPropagation()
              }}
            >
              <MoreHorizontal className="h-5 w-5" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
            {href ? (
              <DropdownMenuItem asChild>
                <Link href={href}>Open</Link>
              </DropdownMenuItem>
            ) : (
              <DropdownMenuItem>Open</DropdownMenuItem>
            )}
            <DropdownMenuSeparator />
            <DropdownMenuItem 
              onClick={(e) => {
                e.preventDefault()
                e.stopPropagation()
                setDeleteDialogOpen(true)
              }}
              className="text-red-600 focus:text-red-600"
            >
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-center justify-between text-xs">
          <span className="text-muted-foreground">Project Clarity</span>
          <span className="font-medium">{clarity}%</span>
        </div>
        <Progress value={clarity} className="h-2" />
        <div className="flex items-center justify-between pt-1 text-xs">
          <span className="text-muted-foreground">{date}</span>
          <Badge variant={badge.variant as any}>{badge.label}</Badge>
        </div>
      </CardContent>
    </>
  )

  const card = <Card className="shadow-sm rounded-xl">{content}</Card>

  return (
    <>
      {href ? (
        <Link 
          href={href} 
          className="block transition-transform hover:-translate-y-0.5"
          onMouseEnter={handlePrefetch}
        >
          {card}
        </Link>
      ) : (
        card
      )}
      
      {/* Delete confirmation dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Project</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{title}"? This action cannot be undone and will permanently remove all project data, files, and analysis.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleDelete}
              disabled={isDeleting}
              className="bg-red-600 hover:bg-red-700"
            >
              {isDeleting ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
