"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { workoutExerciseSchema } from "@/lib/validations/workouts";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/ui/native-select";
import { Textarea } from "@/components/ui/textarea";

type ExerciseOption = {
  id: string;
  name: string;
  trainer_id: string | null;
};

export function AddExerciseForm({
  workoutId,
  nextOrder,
  exercises,
}: {
  workoutId: string;
  nextOrder: number;
  exercises: ExerciseOption[];
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [exerciseId, setExerciseId] = useState(exercises[0]?.id ?? "");
  const [sets, setSets] = useState("3");
  const [reps, setReps] = useState("8-12");
  const [weight, setWeight] = useState("");
  const [restSeconds, setRestSeconds] = useState("90");
  const [notes, setNotes] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    const parsed = workoutExerciseSchema.safeParse({
      exerciseId,
      sets,
      reps,
      weight,
      restSeconds,
      notes,
    });
    if (!parsed.success) {
      setError(parsed.error.errors[0].message);
      return;
    }

    setLoading(true);
    const supabase = createClient();
    const { error: insertError } = await supabase.from("workout_exercises").insert({
      workout_id: workoutId,
      exercise_id: parsed.data.exerciseId,
      order_index: nextOrder,
      sets: parsed.data.sets,
      reps: parsed.data.reps,
      weight: parsed.data.weight || null,
      rest_seconds: parsed.data.restSeconds ?? null,
      notes: parsed.data.notes || null,
    });
    setLoading(false);

    if (insertError) {
      setError(insertError.message);
      return;
    }

    setWeight("");
    setNotes("");
    setOpen(false);
    router.refresh();
  }

  if (exercises.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        Add an exercise to your library first, then come back here.
      </p>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button type="button" onClick={() => setOpen((current) => !current)}>
          {open ? "Cancel" : "Add exercise"}
        </Button>
      </div>

      {open && (
        <Card>
          <CardContent className="pt-6">
            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <div className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
                  {error}
                </div>
              )}
              <div className="space-y-2">
                <Label htmlFor="line-exercise">Exercise</Label>
                <NativeSelect
                  id="line-exercise"
                  value={exerciseId}
                  onChange={(e) => setExerciseId(e.target.value)}
                >
                  {exercises.map((exercise) => (
                    <option key={exercise.id} value={exercise.id}>
                      {exercise.name}
                      {exercise.trainer_id ? " (yours)" : ""}
                    </option>
                  ))}
                </NativeSelect>
              </div>
              <div className="grid gap-4 sm:grid-cols-4">
                <div className="space-y-2">
                  <Label htmlFor="line-sets">Sets</Label>
                  <Input id="line-sets" value={sets} onChange={(e) => setSets(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="line-reps">Reps</Label>
                  <Input id="line-reps" value={reps} onChange={(e) => setReps(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="line-weight">Weight</Label>
                  <Input
                    id="line-weight"
                    value={weight}
                    onChange={(e) => setWeight(e.target.value)}
                    placeholder="60kg"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="line-rest">Rest (sec)</Label>
                  <Input
                    id="line-rest"
                    value={restSeconds}
                    onChange={(e) => setRestSeconds(e.target.value)}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="line-notes">Notes</Label>
                <Textarea
                  id="line-notes"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={2}
                  placeholder="Optional cue for the client"
                />
              </div>
              <div className="flex justify-end">
                <Button type="submit" disabled={loading}>
                  {loading ? "Adding..." : "Add to workout"}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
