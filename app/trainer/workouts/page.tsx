import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Card, CardContent } from "@/components/ui/card";
import { formatDate } from "@/lib/utils";
import { CreateWorkoutForm } from "./create-workout-form";

type WorkoutRow = {
  id: string;
  name: string;
  description: string | null;
  updated_at: string;
};

type WorkoutExerciseCount = {
  workout_id: string;
};

export default async function TrainerWorkoutsPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: workouts, error } = await supabase
    .from("workouts")
    .select("id, name, description, updated_at")
    .eq("trainer_id", user.id)
    .order("updated_at", { ascending: false })
    .overrideTypes<WorkoutRow[], { merge: false }>();

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

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Workouts</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Build templates, then assign them to active clients.
        </p>
      </div>

      <CreateWorkoutForm />

      {(workouts ?? []).length === 0 ? (
        <Card>
          <CardContent className="py-10 text-center text-sm text-muted-foreground">
            No workouts yet. Create one, add exercises, then assign it.
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3">
          {(workouts ?? []).map((workout) => (
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
                      {countByWorkout.get(workout.id) ?? 0} exercises
                      {workout.description ? ` · ${workout.description}` : ""}
                    </p>
                  </div>
                  <p className="text-xs text-muted-foreground">{formatDate(workout.updated_at)}</p>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
