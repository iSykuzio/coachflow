import { Card, CardContent } from "@/components/ui/card";

export function ComingSoon({ title, stage }: { title: string; stage: string }) {
  return (
    <div>
      <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
      <Card className="mt-6">
        <CardContent className="py-10 text-center">
          <p className="text-sm text-muted-foreground">
            This screen is wired up and route-protected — the full feature lands in {stage}.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
