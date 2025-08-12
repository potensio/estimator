"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { UserMenu } from "@/components/user-menu";

interface TopNavProps {
  user?: {
    name: string;
    email: string;
  };
  workspace?: {
    name: string;
  };
}

export function TopNav({ user, workspace }: TopNavProps) {
  const pathname = usePathname();
  const isActive = (href: string) => pathname?.startsWith(href);

  return (
    <header className="sticky top-0 z-40 border-b bg-background/80 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="mx-auto flex h-14 items-center justify-between px-4 sm:h-16 sm:px-6 lg:px-8 xl:max-w-7xl">
        <nav className="flex items-center gap-6">
          <Link
            href="/projects"
            className={cn(
              "text-sm font-medium transition-colors hover:text-foreground",
              isActive("/projects")
                ? "text-foreground"
                : "text-muted-foreground"
            )}
          >
            Projects
          </Link>
          <span
            className={cn(
              "text-sm font-medium text-muted-foreground/50 cursor-not-allowed"
            )}
          >
            Settings
          </span>
        </nav>

        {user && workspace && (
          <div className="flex items-center gap-3">
            <span className="text-sm font-medium text-foreground hidden sm:block">
              {user.name}
            </span>
            <UserMenu user={user} workspace={workspace} />
          </div>
        )}
      </div>
    </header>
  );
}
