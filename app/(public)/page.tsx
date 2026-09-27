import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const STEPS = [
  {
    number: "01",
    title: "Invite a client",
    description: "Send their name and email. They join with that address.",
  },
  {
    number: "02",
    title: "Write the session",
    description: "Add the movements, sets, reps and rest on one page.",
  },
  {
    number: "03",
    title: "See the result",
    description: "They log the work. You see the completed session.",
  },
];

const SESSION = [
  ["Back Squat", "4 × 8", "120s"],
  ["Romanian Deadlift", "3 × 8–10", "120s"],
  ["Leg Press", "3 × 12", "90s"],
  ["Calf Raise", "4 × 15", "60s"],
];

export default function LandingPage() {
  return (
    <div>
      <section className="container grid items-center gap-12 py-16 sm:py-24 lg:grid-cols-[1.05fr_0.95fr] lg:py-28">
        <div>
          <p className="text-sm font-medium tracking-wide text-muted-foreground">For personal trainers</p>
          <h1 className="mt-4 max-w-xl text-4xl font-semibold tracking-tight text-balance sm:text-6xl sm:leading-[1.05]">
            Write the workout. Hand it to the client.
          </h1>
          <p className="mt-5 max-w-md text-lg leading-8 text-muted-foreground">
            CoachFlow is a quiet place to invite clients, build a session, and see what they actually logged.
          </p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Link href="/signup" className={cn(buttonVariants({ size: "lg" }))}>
              Create a trainer account
            </Link>
            <Link href="/login" className={cn(buttonVariants({ size: "lg", variant: "outline" }))}>
              Log in
            </Link>
          </div>
        </div>

        <div className="rounded-2xl border border-black/10 bg-white p-4 shadow-[0_24px_60px_-32px_rgba(20,20,20,0.45)] sm:p-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-xs font-medium uppercase tracking-[0.16em] text-muted-foreground">Today</p>
              <p className="mt-1 text-2xl font-semibold tracking-tight">Leg day</p>
            </div>
            <span className="rounded-full bg-secondary px-3 py-1 text-xs font-medium text-foreground">Assigned</span>
          </div>
          <ol className="mt-6 divide-y divide-black/5">
            {SESSION.map(([name, prescription, rest], index) => (
              <li key={name} className="flex items-center justify-between gap-4 py-3.5">
                <div className="flex items-center gap-3">
                  <span className="w-5 text-sm text-muted-foreground">{index + 1}</span>
                  <span className="font-medium">{name}</span>
                </div>
                <span className="text-sm text-muted-foreground">
                  {prescription}
                  <span className="hidden sm:inline"> · {rest}</span>
                </span>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section className="border-t border-black/5 bg-white">
        <div className="container grid gap-8 py-14 sm:grid-cols-3 sm:py-16">
          {STEPS.map((step) => (
            <div key={step.number}>
              <p className="text-xs font-medium tracking-[0.16em] text-muted-foreground">{step.number}</p>
              <h2 className="mt-3 text-lg font-semibold tracking-tight">{step.title}</h2>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">{step.description}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="container py-14 sm:py-16">
        <div className="max-w-xl">
          <h2 className="text-2xl font-semibold tracking-tight">Simple on the client’s phone</h2>
          <p className="mt-3 text-muted-foreground">
            They open the assigned workout, record the sets, and finish. You see the same result.
          </p>
        </div>
        <p className="mt-8 text-sm text-muted-foreground">
          Invited by a trainer?{" "}
          <Link href="/signup" className="font-medium text-foreground underline-offset-4 hover:underline">
            Sign up as a client
          </Link>{" "}
          with the same email.
        </p>
      </section>
    </div>
  );
}
