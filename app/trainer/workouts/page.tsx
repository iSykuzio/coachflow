import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Card, CardContent } from "@/components/ui/card";
import { formatDate } from "@/lib/utils";
import { SessionBuilder } from "./session-builder";

type WorkoutRow = {
  id: string;
  name: string;
  description: string | null;
  updated_at: string;
};

type LibraryExercise = {
  id: string;
  name: string;
  trainer_id: string | null;
};

type ClientLink = { client_id: string };
type ProfileRow = { id: string; full_name: string | null };
type WorkoutExerciseCount = { workout_id: string };

export default async function TrainerWorkoutsPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const [{ data: workouts, error }, { data: exerciseRows }, { data: clientLinks }] = await Promise.all([
    supabase
      .from("workouts")
      .select("id, name, description, updated_at")
      .eq("trainer_id", user.id)
      .order("updated_at", { ascending: false })
      .overrideTypes<WorkoutRow[], { merge: false }>(),
    supabase
      .from("exercises")
      .select("id, name, trainer_id")
      .or(`trainer_id.is.null,trainer_id.eq.${user.id}`)
      .order("name")
      .overrideTypes<LibraryExercise[], { merge: false }>(),
    supabase
      .from("trainer_clients")
      .select("client_id")
      .eq("trainer_id", user.id)
      .eq("status", "active")
      .overrideTypes<ClientLink[], { merge: false }>(),
  ]);

  if (error) {
    return (
      <Card>
        <CardContent className="py-10 text-center text-sm text-muted-foreground">
          We couldn’t load your workouts right now.
        </CardContent>
      </Card>
    );
  }

  const workoutIds = (workouts ?? []).map((workout) => workout.id);
  const countByWorkout = new Map<string, number>();

  if (workoutIds.length > 0) {
    const { data: lines } = await supabase
      .from("workout_exercises")
      .select("workout_id")
      .in("workout_id", workoutIds)
      .overrideTypes<WorkoutExerciseCount[], { merge: false }>();

    for (const line of lines ?? []) {
      countByWorkout.set(line.workout_id, (countByWorkout.get(line.workout_id) ?? 0) + 1);
    }
  }

  const clientIds = (clientLinks ?? []).map((link) => link.client_id);
  let clients: { id: string; name: string }[] = [];
  if (clientIds.length > 0) {
    const { data: profiles } = await supabase
      .from("profiles")
      .select("id, full_name")
      .in("id", clientIds)
      .overrideTypes<ProfileRow[], { merge: false }>();
    clients = (profiles ?? []).map((profile) => ({ id: profile.id, name: profile.full_name ?? "Client" }));
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Workouts</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Type the full session on this page. Existing movements are reused automatically. You do not need to visit the Exercise library.
        </p>
        <p className="mt-2 text-sm text-muted-foreground">
          A workout is a full session. Exercises are the individual movements inside it.
        </p>
      </div>

      <SessionBuilder exercises={exerciseRows ?? []} clients={clients} />

      {(workouts ?? []).length === 0 ? (
        <Card>
          <CardContent className="py-10 text-center text-sm text-muted-foreground">
            No workouts yet. Create a session, add exercises from your library, then assign it.
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3">
          {(workouts ?? []).map((workout) => {
            const count = countByWorkout.get(workout.id) ?? 0;
            return (
              <Link
                key={workout.id}
                href={`/trainer/workouts/${workout.id}`}
                className="block rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              >
                <Card className="transition-colors hover:bg-secondary/40">
                  <CardContent className="flex items-center justify-between gap-4 py-4">
                    <div>
                      <p className="font-medium text-foreground">{workout.name}</p>
                      <p className="mt-1 text-sm text-muted-foreground">
                        {count} {count === 1 ? "exercise" : "exercises"}
                        {workout.description ? ` · ${workout.description}` : ""}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-medium text-foreground">Edit</p>
                      <p className="mt-1 text-xs text-muted-foreground">{formatDate(workout.updated_at)}</p>
                    </div>
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
