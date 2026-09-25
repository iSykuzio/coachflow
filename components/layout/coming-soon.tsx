import { Card, CardContent } from "@/components/ui/card";

export function ComingSoon({ title }: { title: string; stage?: string }) {
  return (
    <div>
      <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
      <p className="mt-1 text-sm text-muted-foreground">Not available in this version.</p>
      <Card className="mt-6">
        <CardContent className="py-10 text-center text-sm leading-6 text-muted-foreground">
          In-app messages are not built yet. Use your usual text or email with your trainer or client.
          Nothing is sent from this page.
        </CardContent>
      </Card>
    </div>
  );
}
