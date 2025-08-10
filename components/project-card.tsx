"use client"

import Link from "next/link"
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
import { MoreHorizontal } from "lucide-react"

type Status = "Active" | "In Progress" | "Completed" | "On Hold"

export type Project = {
  id: string
  title: string
  company: string
  clarity: number
  status: Status
  date: string
  href?: string
}

export function ProjectCard({ title, company, clarity, status, date, href }: Project) {
  const badge =
    status === "Completed"
      ? { variant: "secondary", label: "Completed" }
      : status === "In Progress"
        ? { variant: "outline", label: "In Progress" }
        : status === "On Hold"
          ? { variant: "secondary", label: "On Hold" }
          : { variant: "secondary", label: "Active" }

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
            <DropdownMenuItem onClick={(e) => e.preventDefault()}>Rename</DropdownMenuItem>
            <DropdownMenuItem onClick={(e) => e.preventDefault()}>Archive</DropdownMenuItem>
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

  return href ? (
    <Link href={href} className="block transition-transform hover:-translate-y-0.5">
      {card}
    </Link>
  ) : (
    card
  )
}
