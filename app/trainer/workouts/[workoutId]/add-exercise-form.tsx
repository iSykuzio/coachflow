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
  const [search, setSearch] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [library, setLibrary] = useState(exercises);
  const needle = search.trim().toLowerCase();
  const visible = library.filter((exercise) => !needle || exercise.name.toLowerCase().includes(needle));
  const mine = visible.filter((exercise) => exercise.trainer_id);
  const shared = visible.filter((exercise) => !exercise.trainer_id);
  const exact = library.some((exercise) => exercise.name.toLowerCase() === needle);

  async function createMovement() {
    const typed = search.trim();
    if (typed.length < 2) {
      setError("Enter at least 2 characters to create an exercise.");
      return;
    }
    const existing = library.find((exercise) => exercise.name.toLowerCase() === typed.toLowerCase());
    if (existing) {
      setExerciseId(existing.id);
      return;
    }
    setError(null);
    setLoading(true);
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      setLoading(false);
      setError("Not authenticated");
      return;
    }
    const { data, error: insertError } = await supabase
      .from("exercises")
      .insert({ trainer_id: user.id, name: typed, is_custom: true })
      .select("id, name, trainer_id")
      .single();
    setLoading(false);
    if (insertError || !data) {
      setError(insertError?.message || "Couldn’t create that exercise.");
      return;
    }
    setLibrary((current) => [...current, data].sort((a, b) => a.name.localeCompare(b.name)));
    setExerciseId(data.id);
    setSearch("");
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!visible.some((exercise) => exercise.id === exerciseId) && !library.some((exercise) => exercise.id === exerciseId)) {
      setError("Choose an exercise from the list.");
      return;
    }

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
                <Label htmlFor="line-search">Find an exercise</Label>
                <Input
                  id="line-search"
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Search your library or type a new movement"
                />
              </div>
              {needle.length >= 2 && !exact && (
                <Button type="button" variant="outline" onClick={createMovement} disabled={loading}>
                  + Create “{search.trim()}”
                </Button>
              )}
              <div className="space-y-2">
                <Label htmlFor="line-exercise">Exercise</Label>
                <NativeSelect
                  id="line-exercise"
                  value={exerciseId}
                  onChange={(e) => setExerciseId(e.target.value)}
                >
                  {visible.length === 0 && <option value="">No exercises match</option>}
                  {mine.length > 0 && (
                    <optgroup label="My exercises">
                      {mine.map((exercise) => (
                        <option key={exercise.id} value={exercise.id}>
                          {exercise.name}
                        </option>
                      ))}
                    </optgroup>
                  )}
                  {shared.length > 0 && (
                    <optgroup label="CoachFlow library">
                      {shared.map((exercise) => (
                        <option key={exercise.id} value={exercise.id}>
                          {exercise.name}
                        </option>
                      ))}
                    </optgroup>
                  )}
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
