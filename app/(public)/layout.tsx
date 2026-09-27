import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export default function PublicLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col bg-[#f4f1ea] text-foreground">
      <header className="sticky top-0 z-20 border-b border-black/5 bg-[#f4f1ea]/90 backdrop-blur">
        <div className="container flex h-16 items-center justify-between">
          <Link href="/" className="flex items-center gap-2.5 text-[15px] font-semibold tracking-tight">
            <span className="grid h-8 w-8 place-items-center rounded-md bg-primary text-[11px] font-semibold tracking-wide text-primary-foreground">
              CF
            </span>
            CoachFlow
          </Link>
          <nav className="flex items-center gap-1 sm:gap-2">
            <Link href="/pricing" className="hidden px-3 py-2 text-sm text-muted-foreground hover:text-foreground sm:inline">
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
      <footer className="border-t border-black/5 py-8">
        <div className="container flex flex-col gap-2 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
          <p>CoachFlow</p>
          <p>© {new Date().getFullYear()}</p>
        </div>
      </footer>
    </div>
  );
}
