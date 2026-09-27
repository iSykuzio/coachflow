"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { workoutExerciseSchema } from "@/lib/validations/workouts";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

type ExerciseOption = {
  id: string;
  name: string;
  trainer_id: string | null;
};

function displayName(value: string) {
  return value.trim().replace(/\s+/g, " ");
}

function nameKey(value: string) {
  return displayName(value).toLowerCase();
}

function matchingExercise(name: string, exercises: ExerciseOption[]) {
  const key = nameKey(name);
  const matches = exercises.filter((exercise) => nameKey(exercise.name) === key);
  return matches.find((exercise) => exercise.trainer_id) ?? matches[0];
}

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
  const [exerciseName, setExerciseName] = useState("");
  const [listOpen, setListOpen] = useState(false);
  const [sets, setSets] = useState("3");
  const [reps, setReps] = useState("8-12");
  const [weight, setWeight] = useState("");
  const [restSeconds, setRestSeconds] = useState("90");
  const [notes, setNotes] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const typed = displayName(exerciseName);
  const needle = nameKey(exerciseName);
  const visible = needle
    ? exercises.filter((exercise) => nameKey(exercise.name).includes(needle))
    : exercises;
  const mine = visible.filter((exercise) => exercise.trainer_id);
  const shared = visible.filter((exercise) => !exercise.trainer_id);
  const exact = matchingExercise(exerciseName, exercises);

  async function resolveExerciseId() {
    if (typed.length < 2) throw new Error("Enter an exercise name.");
    const libraryMatch = matchingExercise(typed, exercises);
    if (libraryMatch) return libraryMatch.id;

    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) throw new Error("Not authenticated");

    const { data: hidden, error: hiddenError } = await supabase
      .from("exercises")
      .select("id, name")
      .eq("trainer_id", user.id)
      .eq("in_library", false);
    if (hiddenError) throw new Error(hiddenError.message);

    const reused = (hidden ?? []).find((exercise) => nameKey(exercise.name) === nameKey(typed));
    if (reused) return reused.id;

    const { data, error: insertError } = await supabase
      .from("exercises")
      .insert({
        trainer_id: user.id,
        name: typed,
        is_custom: true,
        in_library: false,
      })
      .select("id")
      .single();
    if (insertError || !data) throw new Error(insertError?.message || "Couldn’t use that exercise.");
    return data.id;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    setLoading(true);
    try {
      const exerciseId = await resolveExerciseId();
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
        setLoading(false);
        return;
      }

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
      if (insertError) {
        setError(insertError.message);
        setLoading(false);
        return;
      }
    } catch (caught) {
      setLoading(false);
      setError(caught instanceof Error ? caught.message : "Couldn’t add that exercise.");
      return;
    }

    setLoading(false);
    setExerciseName("");
    setWeight("");
    setNotes("");
    setListOpen(false);
    setOpen(false);
    router.refresh();
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
                <div className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</div>
              )}
              <div className="space-y-2">
                <Label htmlFor="line-exercise">Exercise</Label>
                <Input
                  id="line-exercise"
                  value={exerciseName}
                  onChange={(event) => setExerciseName(event.target.value)}
                  onFocus={() => setListOpen(true)}
                  placeholder="Type an exercise name..."
                  autoComplete="off"
                />
                {listOpen && (
                  <div className="max-h-60 space-y-3 overflow-auto rounded-md border border-border p-2">
                    {mine.length > 0 && (
                      <ExerciseChoices
                        label="My exercises"
                        exercises={mine}
                        onPick={(name) => {
                          setExerciseName(name);
                          setListOpen(false);
                        }}
                      />
                    )}
                    {shared.length > 0 && (
                      <ExerciseChoices
                        label="CoachFlow library"
                        exercises={shared}
                        onPick={(name) => {
                          setExerciseName(name);
                          setListOpen(false);
                        }}
                      />
                    )}
                    {typed.length >= 2 && !exact && (
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onMouseDown={(event) => event.preventDefault()}
                        onClick={() => {
                          setExerciseName(typed);
                          setListOpen(false);
                        }}
                      >
                        Use “{typed}”
                      </Button>
                    )}
                    {visible.length === 0 && typed.length < 2 && (
                      <p className="px-1 text-sm text-muted-foreground">No exercises yet.</p>
                    )}
                  </div>
                )}
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
                  <Input id="line-rest" value={restSeconds} onChange={(e) => setRestSeconds(e.target.value)} />
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

function ExerciseChoices({
  label,
  exercises,
  onPick,
}: {
  label: string;
  exercises: ExerciseOption[];
  onPick: (name: string) => void;
}) {
  return (
    <div className="space-y-1">
      <p className="px-1 text-xs font-medium uppercase tracking-[0.08em] text-muted-foreground">{label}</p>
      {exercises.map((exercise) => (
        <button
          key={exercise.id}
          type="button"
          className="block w-full rounded-md px-2 py-1.5 text-left text-sm text-foreground hover:bg-secondary"
          onMouseDown={(event) => event.preventDefault()}
          onClick={() => onPick(exercise.name)}
        >
          {exercise.name}
        </button>
      ))}
    </div>
  );
}
