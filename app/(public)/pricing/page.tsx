import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const PLANS = [
  {
    name: "Solo",
    price: "$29",
    description: "For independent trainers just getting started.",
    features: ["Up to 15 clients", "Unlimited workouts", "Progress tracking", "Messaging"],
  },
  {
    name: "Studio",
    price: "$79",
    description: "For growing trainer businesses.",
    features: ["Up to 75 clients", "Unlimited workouts", "Progress tracking", "Messaging", "Priority support"],
    highlighted: true,
  },
  {
    name: "Gym",
    price: "Contact us",
    description: "For gyms with multiple coaches.",
    features: ["Unlimited clients", "Multiple trainers", "Everything in Studio"],
  },
];

export default function PricingPage() {
  return (
    <div className="container py-20">
      <div className="mx-auto max-w-xl text-center">
        <h1 className="text-3xl font-semibold tracking-tight">Simple, transparent pricing</h1>
        <p className="mt-3 text-muted-foreground">
          Start free. Upgrade when you're ready to grow your roster.
        </p>
      </div>

      <div className="mx-auto mt-14 grid max-w-4xl gap-6 sm:grid-cols-3">
        {PLANS.map((plan) => (
          <Card key={plan.name} className={plan.highlighted ? "border-accent shadow-card ring-1 ring-accent" : ""}>
            <CardHeader>
              <CardTitle>{plan.name}</CardTitle>
              <CardDescription>{plan.description}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-semibold">{plan.price}</div>
              <ul className="mt-6 space-y-2 text-sm text-muted-foreground">
                {plan.features.map((f) => (
                  <li key={f}>{f}</li>
                ))}
              </ul>
              <Link
                href="/signup"
                className={cn(buttonVariants({ variant: plan.highlighted ? "default" : "outline" }), "mt-6 w-full")}
              >
                Get started
              </Link>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
