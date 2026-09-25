"use client";

import { useMemo, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { DeleteExerciseButton } from "./delete-exercise-button";

export type LibraryExercise = {
  id: string;
  name: string;
  category: string | null;
  muscle_group: string | null;
  equipment: string | null;
  instructions: string | null;
};

export function ExerciseLibrary({
  custom,
  shared,
}: {
  custom: LibraryExercise[];
  shared: LibraryExercise[];
}) {
  const [query, setQuery] = useState("");
  const needle = query.trim().toLowerCase();

  const filtered = useMemo(() => {
    const match = (item: LibraryExercise) =>
      !needle ||
      [item.name, item.category, item.muscle_group, item.equipment]
        .filter(Boolean)
        .some((value) => value!.toLowerCase().includes(needle));
    return { custom: custom.filter(match), shared: shared.filter(match) };
  }, [custom, shared, needle]);

  return (
    <div className="space-y-6">
      <Input
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        placeholder="Search by name, muscle or equipment"
        aria-label="Search exercises"
      />
      <ExerciseSection
        title="Your exercises"
        empty={needle ? "No custom exercises match that search." : "No custom exercises yet. Add one above."}
        items={filtered.custom}
        canDelete
      />
      <ExerciseSection
        title="CoachFlow library"
        empty={needle ? "No shared exercises match that search." : "The shared library is empty."}
        items={filtered.shared}
        note="Shared exercises can be used in workouts. They can’t be deleted."
      />
    </div>
  );
}

function ExerciseSection({
  title,
  empty,
  items,
  canDelete = false,
  note,
}: {
  title: string;
  empty: string;
  items: LibraryExercise[];
  canDelete?: boolean;
  note?: string;
}) {
  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-sm font-medium uppercase tracking-[0.08em] text-muted-foreground">{title}</h2>
          {note && <p className="mt-1 text-sm text-muted-foreground">{note}</p>}
        </div>
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
                    {[exercise.category, exercise.muscle_group, exercise.equipment].filter(Boolean).join(" · ") ||
                      "No details"}
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
