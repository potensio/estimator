import type React from "react"
import { TopNav } from "@/components/top-nav"

export default function ProjectsLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-svh bg-background">
      <TopNav />
      <main className="mx-auto px-4 py-6 sm:px-6 sm:py-8 lg:px-8 xl:max-w-7xl">{children}</main>
    </div>
  )
}
