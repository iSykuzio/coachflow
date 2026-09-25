"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { exerciseSchema } from "@/lib/validations/exercises";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

export function ExerciseForm() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [category, setCategory] = useState("");
  const [muscleGroup, setMuscleGroup] = useState("");
  const [equipment, setEquipment] = useState("");
  const [instructions, setInstructions] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  function reset() {
    setName("");
    setCategory("");
    setMuscleGroup("");
    setEquipment("");
    setInstructions("");
    setError(null);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    const parsed = exerciseSchema.safeParse({
      name,
      category,
      muscleGroup,
      equipment,
      instructions,
    });
    if (!parsed.success) {
      setError(parsed.error.errors[0].message);
      return;
    }

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

    const { error: insertError } = await supabase.from("exercises").insert({
      trainer_id: user.id,
      name: parsed.data.name,
      category: parsed.data.category || null,
      muscle_group: parsed.data.muscleGroup || null,
      equipment: parsed.data.equipment || null,
      instructions: parsed.data.instructions || null,
      is_custom: true,
    });
    setLoading(false);

    if (insertError) {
      setError("We couldn’t save that exercise. Please try again.");
      return;
    }

    reset();
    setOpen(false);
    setSuccess(`${parsed.data.name} added to your library.`);
    router.refresh();
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button
          type="button"
          onClick={() => {
            setOpen((current) => !current);
            setError(null);
          }}
        >
          {open ? "Cancel" : "Add exercise"}
        </Button>
      </div>

      {success && (
        <div className="rounded-md bg-success/10 px-3 py-2 text-sm text-success">{success}</div>
      )}

      {open && (
        <Card>
          <CardContent className="pt-6">
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <h2 className="text-base font-semibold tracking-tight">New exercise</h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  Saved to your library. You can add it to workouts next.
                </p>
              </div>

              {error && (
                <div className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
                  {error}
                </div>
              )}

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2 sm:col-span-2">
                  <Label htmlFor="exercise-name">Name</Label>
                  <Input
                    id="exercise-name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Goblet squat"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="exercise-category">Category</Label>
                  <Input
                    id="exercise-category"
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    placeholder="Strength"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="exercise-muscle">Muscle group</Label>
                  <Input
                    id="exercise-muscle"
                    value={muscleGroup}
                    onChange={(e) => setMuscleGroup(e.target.value)}
                    placeholder="Quads"
                  />
                </div>
                <div className="space-y-2 sm:col-span-2">
                  <Label htmlFor="exercise-equipment">Equipment</Label>
                  <Input
                    id="exercise-equipment"
                    value={equipment}
                    onChange={(e) => setEquipment(e.target.value)}
                    placeholder="Dumbbell"
                  />
                </div>
                <div className="space-y-2 sm:col-span-2">
                  <Label htmlFor="exercise-instructions">Instructions</Label>
                  <Textarea
                    id="exercise-instructions"
                    value={instructions}
                    onChange={(e) => setInstructions(e.target.value)}
                    placeholder="Optional coaching cues"
                    rows={3}
                  />
                </div>
              </div>

              <div className="flex justify-end">
                <Button type="submit" disabled={loading}>
                  {loading ? "Saving..." : "Save exercise"}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
