"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { workoutSchema } from "@/lib/validations/workouts";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { WorkoutLine } from "./workout-lines";

export function EditWorkoutForm({
  workoutId,
  name,
  description,
}: {
  workoutId: string;
  name: string;
  description: string | null;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [nextName, setNextName] = useState(name);
  const [nextDescription, setNextDescription] = useState(description ?? "");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const parsed = workoutSchema.safeParse({ name: nextName, description: nextDescription });
    if (!parsed.success) {
      setError(parsed.error.errors[0].message);
      return;
    }
    setLoading(true);
    const supabase = createClient();
    const { error: updateError } = await supabase
      .from("workouts")
      .update({
        name: parsed.data.name,
        description: parsed.data.description || null,
      })
      .eq("id", workoutId);
    setLoading(false);
    if (updateError) {
      setError(updateError.message || "Couldn’t update this workout.");
      return;
    }
    setOpen(false);
    router.refresh();
  }

  return (
    <div className="space-y-3">
      <Button type="button" variant="outline" onClick={() => setOpen((current) => !current)}>
        {open ? "Close" : "Edit name"}
      </Button>
      {open && (
        <Card>
          <CardContent className="pt-6">
            <form onSubmit={handleSubmit} className="space-y-4">
              {error && <div className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</div>}
              <div className="space-y-2">
                <Label htmlFor="edit-workout-name">Name</Label>
                <Input id="edit-workout-name" value={nextName} onChange={(e) => setNextName(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-workout-description">Description</Label>
                <Textarea
                  id="edit-workout-description"
                  value={nextDescription}
                  onChange={(e) => setNextDescription(e.target.value)}
                  rows={3}
                />
              </div>
              <div className="flex justify-end">
                <Button type="submit" disabled={loading}>
                  {loading ? "Saving..." : "Save workout"}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

export function DuplicateWorkoutButton({
  name,
  description,
  lines,
}: {
  name: string;
  description: string | null;
  lines: WorkoutLine[];
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function duplicate() {
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

    const { data: created, error: insertError } = await supabase
      .from("workouts")
      .insert({
        trainer_id: user.id,
        name: `${name} copy`,
        description,
      })
      .select("id")
      .single();

    if (insertError || !created) {
      setLoading(false);
      setError(insertError?.message ?? "Couldn’t duplicate this workout.");
      return;
    }

    if (lines.length > 0) {
      const { error: lineError } = await supabase.from("workout_exercises").insert(
        lines.map((line, index) => ({
          workout_id: created.id,
          exercise_id: line.exerciseId,
          order_index: index,
          sets: line.sets,
          reps: line.reps,
          weight: line.weight,
          rest_seconds: line.rest_seconds,
          notes: line.notes,
        }))
      );
      if (lineError) {
        setLoading(false);
        setError("The copy was created, but its exercises could not be copied.");
        router.push(`/trainer/workouts/${created.id}`);
        return;
      }
    }

    setLoading(false);
    router.push(`/trainer/workouts/${created.id}`);
    router.refresh();
  }

  return (
    <div className="space-y-2">
      <Button type="button" variant="outline" onClick={duplicate} disabled={loading}>
        {loading ? "Copying..." : "Duplicate"}
      </Button>
      {error && <p className="text-sm text-destructive">{error}</p>}
    </div>
  );
}
