import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Card, CardContent } from "@/components/ui/card";

const FEATURES = [
  {
    title: "Build workouts fast",
    description: "Assemble programs from your exercise library in minutes, not spreadsheets.",
  },
  {
    title: "Assign in one click",
    description: "Push a workout to any client and know exactly when they complete it.",
  },
  {
    title: "See real progress",
    description: "Every set, rep and weight your clients log, organized and ready to review.",
  },
];

export default function LandingPage() {
  return (
    <div className="container py-20">
      <div className="mx-auto max-w-2xl text-center">
        <h1 className="text-4xl font-semibold tracking-tight sm:text-5xl">
          Coaching software that gets out of your way
        </h1>
        <p className="mt-5 text-lg text-muted-foreground">
          Everything a trainer needs to coach their clients — without the software
          becoming another headache.
        </p>
        <div className="mt-8 flex items-center justify-center gap-3">
          <Link href="/signup" className={cn(buttonVariants({ size: "lg" }))}>
            Start coaching for free
          </Link>
          <Link href="/pricing" className={cn(buttonVariants({ size: "lg", variant: "outline" }))}>
            See pricing
          </Link>
        </div>
      </div>

      <div className="mx-auto mt-20 grid max-w-4xl gap-6 sm:grid-cols-3">
        {FEATURES.map((f) => (
          <Card key={f.title}>
            <CardContent className="pt-6">
              <h3 className="font-semibold">{f.title}</h3>
              <p className="mt-2 text-sm text-muted-foreground">{f.description}</p>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
