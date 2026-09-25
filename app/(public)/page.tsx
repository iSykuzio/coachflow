import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Card, CardContent } from "@/components/ui/card";

const TRAINER = [
  {
    title: "Invite a client",
    description: "Create an invitation with their name and email. They join when they sign up with that address.",
  },
  {
    title: "Build the workout",
    description: "Pick shared or custom exercises, set the order, sets, reps and rest, then assign it.",
  },
  {
    title: "See what they logged",
    description: "When a client saves sets and finishes, the workout shows up as completed.",
  },
];

const CLIENT = [
  "See the trainer they are connected to",
  "Open the workout that is waiting",
  "Log reps, weight and notes from a phone",
  "Finish the session and find it later in History",
];

export default function LandingPage() {
  return (
    <div className="container py-16 sm:py-24">
      <div className="mx-auto max-w-2xl text-center">
        <p className="text-sm font-medium uppercase tracking-[0.14em] text-muted-foreground">
          For personal trainers
        </p>
        <h1 className="mt-3 text-4xl font-semibold tracking-tight sm:text-5xl">
          Manage clients and programs without the extra software headache
        </h1>
        <p className="mt-5 text-lg text-muted-foreground">
          CoachFlow is a simple place to invite clients, build workouts, assign them, and let people log what they actually did.
        </p>
        <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <Link href="/signup" className={cn(buttonVariants({ size: "lg" }), "w-full sm:w-auto")}>
            Create a trainer account
          </Link>
          <Link href="/login" className={cn(buttonVariants({ size: "lg", variant: "outline" }), "w-full sm:w-auto")}>
            Log in
          </Link>
        </div>
      </div>

      <div className="mx-auto mt-16 grid max-w-4xl gap-4 sm:grid-cols-3">
        {TRAINER.map((item) => (
          <Card key={item.title}>
            <CardContent className="pt-6">
              <h2 className="font-semibold">{item.title}</h2>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">{item.description}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="mx-auto mt-16 max-w-3xl">
        <h2 className="text-2xl font-semibold tracking-tight">What a client sees</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Clients do not manage programs. They open the workout you assigned and record the session.
        </p>
        <ul className="mt-6 grid gap-3 sm:grid-cols-2">
          {CLIENT.map((item) => (
            <li key={item} className="rounded-lg border border-border bg-card px-4 py-3 text-sm">
              {item}
            </li>
          ))}
        </ul>
        <p className="mt-8 text-sm text-muted-foreground">
          Invited by a trainer?{" "}
          <Link href="/signup" className="font-medium text-foreground underline-offset-4 hover:underline">
            Sign up as a client
          </Link>{" "}
          with the same email they used.
        </p>
      </div>
    </div>
  );
}
