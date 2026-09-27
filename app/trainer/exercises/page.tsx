import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Card, CardContent } from "@/components/ui/card";
import { ExerciseForm } from "./exercise-form";
import { ExerciseLibrary, type LibraryExercise } from "./exercise-library";
import { CATEGORY_SUGGESTIONS, EQUIPMENT_SUGGESTIONS, MUSCLE_SUGGESTIONS, mergeSuggestions } from "./suggestions";

type ExerciseRow = LibraryExercise & {
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
    .eq("in_library", true)
    .order("name")
    .overrideTypes<ExerciseRow[], { merge: false }>();

  if (error) {
    return (
      <Card>
        <CardContent className="py-10 text-center text-sm text-muted-foreground">
          We couldn’t load the exercise library. Refresh and try again.
        </CardContent>
      </Card>
    );
  }

  const shared = (exercises ?? []).filter((item) => item.trainer_id === null);
  const custom = (exercises ?? []).filter((item) => item.trainer_id === user.id);
  const suggestions = {
    categories: mergeSuggestions(CATEGORY_SUGGESTIONS, (exercises ?? []).map((item) => item.category)),
    muscles: mergeSuggestions(MUSCLE_SUGGESTIONS, (exercises ?? []).map((item) => item.muscle_group)),
    equipment: mergeSuggestions(EQUIPMENT_SUGGESTIONS, (exercises ?? []).map((item) => item.equipment)),
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Exercise library</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          CoachFlow Library is ready to use in any workout. My Exercises is for movements you create yourself.
        </p>
      </div>
      <ExerciseForm suggestions={suggestions} />
      <ExerciseLibrary custom={custom} shared={shared} suggestions={suggestions} />
    </div>
  );
}
