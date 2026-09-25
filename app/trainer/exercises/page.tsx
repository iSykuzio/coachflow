import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Card, CardContent } from "@/components/ui/card";
import { ExerciseForm } from "./exercise-form";
import { DeleteExerciseButton } from "./delete-exercise-button";

type ExerciseRow = {
  id: string;
  name: string;
  category: string | null;
  muscle_group: string | null;
  equipment: string | null;
  instructions: string | null;
  is_custom: boolean;
  trainer_id: string | null;
};

export default async function TrainerExercisesPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: exercises, error } = await supabase
    .from("exercises")
    .select("id, name, category, muscle_group, equipment, instructions, is_custom, trainer_id")
    .or(`trainer_id.is.null,trainer_id.eq.${user.id}`)
    .order("name")
    .overrideTypes<ExerciseRow[], { merge: false }>();

  if (error) {
    return (
      <Card>
        <CardContent className="py-10 text-center text-sm text-muted-foreground">
          We couldn’t load the exercise library right now.
        </CardContent>
      </Card>
    );
  }

  const shared = (exercises ?? []).filter((item) => item.trainer_id === null);
  const custom = (exercises ?? []).filter((item) => item.trainer_id === user.id);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Exercises</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Use the shared library or add your own, then build workouts from them.
        </p>
      </div>

      <ExerciseForm />

      <ExerciseSection title="Your exercises" empty="No custom exercises yet." items={custom} canDelete />
      <ExerciseSection title="Shared library" empty="Shared library is empty." items={shared} />
    </div>
  );
}

function ExerciseSection({
  title,
  empty,
  items,
  canDelete = false,
}: {
  title: string;
  empty: string;
  items: ExerciseRow[];
  canDelete?: boolean;
}) {
  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-medium uppercase tracking-[0.08em] text-muted-foreground">
          {title}
        </h2>
        <span className="rounded-full border border-border bg-muted px-2 py-1 text-xs text-muted-foreground">
          {items.length}
        </span>
      </div>

      {items.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center text-sm text-muted-foreground">{empty}</CardContent>
        </Card>
      ) : (
        <div className="grid gap-3">
          {items.map((exercise) => (
            <Card key={exercise.id}>
              <CardContent className="flex items-start justify-between gap-4 py-4">
                <div>
                  <p className="font-medium text-foreground">{exercise.name}</p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {[exercise.category, exercise.muscle_group, exercise.equipment]
                      .filter(Boolean)
                      .join(" · ") || "No details"}
                  </p>
                  {exercise.instructions && (
                    <p className="mt-2 text-sm text-muted-foreground">{exercise.instructions}</p>
                  )}
                </div>
                {canDelete && <DeleteExerciseButton exerciseId={exercise.id} name={exercise.name} />}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </section>
  );
}
