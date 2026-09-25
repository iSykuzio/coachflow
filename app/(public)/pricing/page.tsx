import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export default function PricingPage() {
  return (
    <div className="container py-16 sm:py-20">
      <div className="mx-auto max-w-xl text-center">
        <h1 className="text-3xl font-semibold tracking-tight">Pricing is not live yet</h1>
        <p className="mt-3 text-muted-foreground">
          CoachFlow is free to try while the product is in early use. There is no checkout, subscription, or card charge in the app.
        </p>
      </div>

      <Card className="mx-auto mt-10 max-w-lg">
        <CardHeader>
          <CardTitle>Early access</CardTitle>
          <CardDescription>Create an account and use the trainer and client flow today.</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-3xl font-semibold">Free</p>
          <ul className="mt-6 space-y-2 text-sm text-muted-foreground">
            <li>Invite clients in the app</li>
            <li>Build and assign workouts</li>
            <li>Clients log sets and review history</li>
          </ul>
          <Link href="/signup" className={cn(buttonVariants(), "mt-6 w-full")}>
            Create an account
          </Link>
        </CardContent>
      </Card>
    </div>
  );
}
