import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Card, CardContent } from "@/components/ui/card";
import { formatDate } from "@/lib/utils";

type HistoryItem = {
  session_id: string;
  assigned_workout_id: string;
  completed_at: string | null;
  workout_name: string;
};

export default async function ClientHistoryPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: sessions, error } = await supabase
    .rpc("list_my_completed_sessions")
    .overrideTypes<HistoryItem[], { merge: false }>();

  if (error) {
    return (
      <Card>
        <CardContent className="py-10 text-center text-sm text-muted-foreground">
          {error.message}
        </CardContent>
      </Card>
    );
  }

  const items = Array.isArray(sessions) ? sessions : [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">History</h1>
        <p className="mt-1 text-sm text-muted-foreground">Completed sessions.</p>
      </div>

      {items.length === 0 ? (
        <Card>
          <CardContent className="py-10 text-center text-sm text-muted-foreground">
            No completed workouts yet.
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3">
          {items.map((session) => {
            return (
              <Link
                key={session.session_id}
                href={`/client/workouts/${session.assigned_workout_id}`}
                className="block rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              >
                <Card className="transition-colors hover:bg-secondary/40">
                  <CardContent className="flex items-center justify-between gap-4 py-4">
                    <div>
                      <p className="font-medium text-foreground">{session.workout_name || "Workout"}</p>
                      <p className="text-sm text-muted-foreground">
                        {session.completed_at ? formatDate(session.completed_at) : "Completed"}
                      </p>
                    </div>
                    <span className="text-xs font-medium text-muted-foreground">Completed</span>
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
