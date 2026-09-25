
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { Avatar } from "@/components/ui/avatar";
import {
  LayoutDashboard,
  Users,
  Dumbbell,
  ClipboardList,
  MessageSquare,
  type LucideIcon,
} from "lucide-react";

const ICONS = {
  dashboard: LayoutDashboard,
  users: Users,
  dumbbell: Dumbbell,
  clipboard: ClipboardList,
  messages: MessageSquare,
} satisfies Record<string, LucideIcon>;

export interface NavItem {
  label: string;
  href: string;
  icon: keyof typeof ICONS;
}

export function AppShell({
  children,
  navItems,
  userName,
  userEmail,
  brandHref,
}: {
  children: React.ReactNode;
  navItems: NavItem[];
  userName: string;
  userEmail: string;
  brandHref: string;
}) {
  const pathname = usePathname();

  return (
    <div className="flex min-h-screen">
      <aside className="hidden w-64 shrink-0 flex-col border-r border-border bg-card sm:flex">
        <div className="flex h-16 items-center border-b border-border px-6">
          <Link href={brandHref} className="text-lg font-semibold tracking-tight">
            CoachFlow
          </Link>
        </div>

        <nav className="flex-1 space-y-1 p-3">
          {navItems.map((item) => {
            const active =
              pathname === item.href ||
              pathname.startsWith(item.href + "/");
            const Icon = ICONS[item.icon];

            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                  active
                    ? "bg-secondary text-foreground"
                    : "text-muted-foreground hover:bg-secondary hover:text-foreground"
                )}
              >
                <Icon className="h-4 w-4" />
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="border-t border-border p-3">
          <div className="flex items-center gap-3 rounded-md px-2 py-2">
            <Avatar name={userName} />
            <div className="min-w-0">
              <p className="truncate text-sm font-medium">{userName}</p>
              <p className="truncate text-xs text-muted-foreground">
                {userEmail}
              </p>
            </div>
          </div>

          <form action="/auth/signout" method="post">
            <button
              type="submit"
              className="mt-1 w-full rounded-md px-3 py-2 text-left text-sm text-muted-foreground hover:bg-secondary hover:text-foreground"
            >
              Log out
            </button>
          </form>
        </div>
      </aside>

      {/* Mobile top bar */}
      <div className="fixed inset-x-0 top-0 z-10 flex h-14 items-center justify-between border-b border-border bg-card px-4 sm:hidden">
        <Link
          href={brandHref}
          className="text-base font-semibold tracking-tight"
        >
          CoachFlow
        </Link>
        <Avatar name={userName} className="h-8 w-8 text-xs" />
      </div>

      <main className="flex-1 pb-20 pt-14 sm:pb-0 sm:pt-0">
        <div className="mx-auto max-w-5xl px-4 py-8 sm:px-8">
          {children}
        </div>
      </main>

      {/* Mobile bottom nav */}
      <nav className="fixed inset-x-0 bottom-0 z-10 flex border-t border-border bg-card sm:hidden">
        {navItems.map((item) => {
          const active =
            pathname === item.href ||
            pathname.startsWith(item.href + "/");
          const Icon = ICONS[item.icon];

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex flex-1 flex-col items-center gap-0.5 py-2.5 text-xs",
                active ? "text-accent" : "text-muted-foreground"
              )}
            >
              <Icon className="h-5 w-5" />
              {item.label}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}