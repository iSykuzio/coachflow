import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export default function PublicLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col">
      <header className="border-b border-border">
        <div className="container flex h-16 items-center justify-between">
          <Link href="/" className="text-lg font-semibold tracking-tight">
            CoachFlow
          </Link>
          <nav className="flex items-center gap-2">
            <Link href="/pricing" className="px-3 py-2 text-sm text-muted-foreground hover:text-foreground">
              Pricing
            </Link>
            <Link href="/login" className="px-3 py-2 text-sm text-muted-foreground hover:text-foreground">
              Log in
            </Link>
            <Link href="/signup" className={cn(buttonVariants({ size: "sm" }))}>
              Get started
            </Link>
          </nav>
        </div>
      </header>
      <main className="flex-1">{children}</main>
      <footer className="border-t border-border py-8">
        <div className="container text-sm text-muted-foreground">
          © {new Date().getFullYear()} CoachFlow. All rights reserved.
        </div>
      </footer>
    </div>
  );
}
