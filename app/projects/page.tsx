import { ProjectCard, type Project } from "@/components/project-card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Search } from "lucide-react"
import { NewProjectDialog } from "@/components/new-project-dialog"

const projects: Project[] = [
  { id: "1", title: "Website Redesign", company: "TechCorp Inc.", clarity: 75, status: "Active", date: "Jan 15, 2025" },
  {
    id: "2",
    title: "Mobile App Development",
    company: "StartupXYZ",
    clarity: 45,
    status: "In Progress",
    date: "Jan 10, 2025",
  },
  {
    id: "3",
    title: "Brand Identity",
    company: "Creative Agency",
    clarity: 100,
    status: "Completed",
    date: "Jan 8, 2025",
  },
  { id: "4", title: "E-commerce Platform", company: "RetailCo", clarity: 30, status: "On Hold", date: "Jan 5, 2025" },
  {
    id: "5",
    title: "Dashboard Analytics",
    company: "DataTech Solutions",
    clarity: 60,
    status: "Active",
    date: "Jan 3, 2025",
  },
  { id: "6", title: "API Integration", company: "FinTech Startup", clarity: 20, status: "Active", date: "Jan 1, 2025" },
]

export default function ProjectsPage() {
  return (
    <>
      <div className="mb-6 space-y-1 sm:mb-8">
        <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">Projects</h1>
        <p className="text-muted-foreground">Manage and track your project progress</p>
      </div>

      <div className="mb-6 flex flex-col gap-3 md:mb-8 md:flex-row md:items-center md:justify-between">
        <div className="flex flex-1 items-center gap-3">
          <div className="relative w-full max-w-md">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input placeholder="Search projects..." className="pl-9" aria-label="Search projects" />
          </div>
          <div className="hidden items-center gap-2 md:flex">
            <Button size="sm" className="rounded-full">
              All
            </Button>
            <Button variant="secondary" size="sm" className="rounded-full">
              Active
            </Button>
            <Button variant="secondary" size="sm" className="rounded-full">
              Completed
            </Button>
            <Button variant="secondary" size="sm" className="rounded-full">
              On Hold
            </Button>
          </div>
        </div>

        <NewProjectDialog />
      </div>

      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:gap-6">
        {projects.map((p) => (
          <ProjectCard key={p.id} {...p} href={`/projects/${p.id}`} />
        ))}
      </section>
    </>
  )
}
