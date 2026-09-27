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
import type { LibraryExercise } from "./exercise-library";

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
      setError(insertError.message || "We couldn’t save that exercise.");
      return;
    }

    reset();
    setOpen(false);
    setSuccess(`${parsed.data.name} added to My exercises.`);
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

      {success && <div className="rounded-md bg-success/10 px-3 py-2 text-sm text-success">{success}</div>}

      {open && (
        <Card>
          <CardContent className="pt-6">
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <h2 className="text-base font-semibold tracking-tight">New exercise</h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  One movement, saved to My exercises. Add it to a workout later.
                </p>
              </div>
              {error && <div className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</div>}
              <ExerciseFields
                idPrefix="new"
                name={name}
                category={category}
                muscleGroup={muscleGroup}
                equipment={equipment}
                instructions={instructions}
                onName={setName}
                onCategory={setCategory}
                onMuscleGroup={setMuscleGroup}
                onEquipment={setEquipment}
                onInstructions={setInstructions}
              />
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

export function ExerciseEditor({
  exercise,
  onDone,
}: {
  exercise: LibraryExercise;
  onDone: () => void;
}) {
  const router = useRouter();
  const [name, setName] = useState(exercise.name);
  const [category, setCategory] = useState(exercise.category ?? "");
  const [muscleGroup, setMuscleGroup] = useState(exercise.muscle_group ?? "");
  const [equipment, setEquipment] = useState(exercise.equipment ?? "");
  const [instructions, setInstructions] = useState(exercise.instructions ?? "");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

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
    const { error: updateError } = await supabase
      .from("exercises")
      .update({
        name: parsed.data.name,
        category: parsed.data.category || null,
        muscle_group: parsed.data.muscleGroup || null,
        equipment: parsed.data.equipment || null,
        instructions: parsed.data.instructions || null,
      })
      .eq("id", exercise.id);
    setLoading(false);

    if (updateError) {
      setError(updateError.message || "We couldn’t update that exercise.");
      return;
    }

    onDone();
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="mt-4 space-y-4 border-t border-border pt-4">
      {error && <div className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</div>}
      <ExerciseFields
        idPrefix={exercise.id}
        name={name}
        category={category}
        muscleGroup={muscleGroup}
        equipment={equipment}
        instructions={instructions}
        onName={setName}
        onCategory={setCategory}
        onMuscleGroup={setMuscleGroup}
        onEquipment={setEquipment}
        onInstructions={setInstructions}
      />
      <div className="flex justify-end gap-2">
        <Button type="button" variant="ghost" onClick={onDone}>
          Cancel
        </Button>
        <Button type="submit" disabled={loading}>
          {loading ? "Saving..." : "Save changes"}
        </Button>
      </div>
    </form>
  );
}

function ExerciseFields({
  idPrefix,
  name,
  category,
  muscleGroup,
  equipment,
  instructions,
  onName,
  onCategory,
  onMuscleGroup,
  onEquipment,
  onInstructions,
}: {
  idPrefix: string;
  name: string;
  category: string;
  muscleGroup: string;
  equipment: string;
  instructions: string;
  onName: (value: string) => void;
  onCategory: (value: string) => void;
  onMuscleGroup: (value: string) => void;
  onEquipment: (value: string) => void;
  onInstructions: (value: string) => void;
}) {
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <div className="space-y-2 sm:col-span-2">
        <Label htmlFor={`${idPrefix}-name`}>Name</Label>
        <Input id={`${idPrefix}-name`} value={name} onChange={(e) => onName(e.target.value)} placeholder="Goblet squat" />
      </div>
      <div className="space-y-2">
        <Label htmlFor={`${idPrefix}-category`}>Category</Label>
        <Input
          id={`${idPrefix}-category`}
          value={category}
          onChange={(e) => onCategory(e.target.value)}
          placeholder="Strength"
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor={`${idPrefix}-muscle`}>Primary muscle group</Label>
        <Input
          id={`${idPrefix}-muscle`}
          value={muscleGroup}
          onChange={(e) => onMuscleGroup(e.target.value)}
          placeholder="Quads"
        />
      </div>
      <div className="space-y-2 sm:col-span-2">
        <Label htmlFor={`${idPrefix}-equipment`}>Equipment</Label>
        <Input
          id={`${idPrefix}-equipment`}
          value={equipment}
          onChange={(e) => onEquipment(e.target.value)}
          placeholder="Dumbbell"
        />
      </div>
      <div className="space-y-2 sm:col-span-2">
        <Label htmlFor={`${idPrefix}-instructions`}>Instructions</Label>
        <Textarea
          id={`${idPrefix}-instructions`}
          value={instructions}
          onChange={(e) => onInstructions(e.target.value)}
          placeholder="Optional coaching cues"
          rows={3}
        />
      </div>
    </div>
  );
}
