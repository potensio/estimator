"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { cn } from "@/lib/utils"

export function TopNav() {
  const pathname = usePathname()
  const isActive = (href: string) => pathname?.startsWith(href)

  return (
    <header className="sticky top-0 z-40 border-b bg-background/80 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="mx-auto flex h-14 items-center justify-between px-4 sm:h-16 sm:px-6 lg:px-8 xl:max-w-7xl">
        <nav className="flex items-center gap-6">
          <Link
            href="/projects"
            className={cn(
              "text-sm font-medium transition-colors hover:text-foreground",
              isActive("/projects") ? "text-foreground" : "text-muted-foreground",
            )}
          >
            Projects
          </Link>
          <Link
            href="/settings"
            className={cn(
              "text-sm font-medium transition-colors hover:text-foreground",
              isActive("/settings") ? "text-foreground" : "text-muted-foreground",
            )}
          >
            Settings
          </Link>
        </nav>

        <div className="flex items-center gap-3">
          <div className="text-right leading-tight">
            <div className="text-sm font-medium">John Doe</div>
            <div className="text-xs text-muted-foreground">Project Manager</div>
          </div>
          <Avatar className="h-8 w-8 sm:h-9 sm:w-9">
            <AvatarFallback className="text-xs">JD</AvatarFallback>
          </Avatar>
        </div>
      </div>
    </header>
  )
}
