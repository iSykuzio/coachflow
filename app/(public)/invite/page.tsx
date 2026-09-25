import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export default function InviteHelpPage() {
  return (
    <div className="container flex min-h-[70vh] items-center justify-center py-16">
      <Card className="w-full max-w-lg">
        <CardHeader>
          <CardTitle>Join your trainer on CoachFlow</CardTitle>
          <CardDescription>
            Your trainer sends an email invitation. Open that email and use the link to set your password. Use the same email address they invited.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-muted-foreground">
          <p>If you already have a client account, the email signs you in and connects you to that trainer.</p>
          <p>A trainer account cannot accept a client invitation.</p>
          <div className="flex gap-3 pt-2">
            <Link href="/login" className={cn(buttonVariants())}>
              Log in
            </Link>
            <Link href="/signup" className={cn(buttonVariants({ variant: "outline" }))}>
              Sign up as a client
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
