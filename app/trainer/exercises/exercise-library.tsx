"use client";

import { useMemo, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/ui/native-select";
import { Button } from "@/components/ui/button";
import { DeleteExerciseButton } from "./delete-exercise-button";
import { ExerciseEditor } from "./exercise-form";

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
  const [muscle, setMuscle] = useState("");
  const [equipment, setEquipment] = useState("");
  const [category, setCategory] = useState("");
  const all = useMemo(() => [...custom, ...shared], [custom, shared]);
  const muscles = uniqueValues(all, "muscle_group");
  const equipmentOptions = uniqueValues(all, "equipment");
  const categories = uniqueValues(all, "category");

  const filtered = useMemo(() => {
    const match = (item: LibraryExercise) => {
      const needle = query.trim().toLowerCase();
      const textMatch =
        !needle ||
        [item.name, item.category, item.muscle_group, item.equipment, item.instructions]
          .filter(Boolean)
          .some((value) => value!.toLowerCase().includes(needle));
      return (
        textMatch &&
        (!muscle || item.muscle_group === muscle) &&
        (!equipment || item.equipment === equipment) &&
        (!category || item.category === category)
      );
    };
    return { custom: custom.filter(match), shared: shared.filter(match) };
  }, [custom, shared, query, muscle, equipment, category]);

  return (
    <div className="space-y-6">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <div className="space-y-2 sm:col-span-2 lg:col-span-1">
          <Label htmlFor="exercise-search">Search</Label>
          <Input
            id="exercise-search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Name or cue"
          />
        </div>
        <FilterSelect id="filter-muscle" label="Muscle group" value={muscle} options={muscles} onChange={setMuscle} />
        <FilterSelect
          id="filter-equipment"
          label="Equipment"
          value={equipment}
          options={equipmentOptions}
          onChange={setEquipment}
        />
        <FilterSelect id="filter-category" label="Category" value={category} options={categories} onChange={setCategory} />
      </div>
      <ExerciseSection
        title="My exercises"
        empty={
          query || muscle || equipment || category
            ? "No exercises match those filters."
            : "No exercises yet. Add one movement above, then use it in a workout."
        }
        items={filtered.custom}
        editable
      />
      <ExerciseSection
        title="CoachFlow library"
        empty={
          query || muscle || equipment || category
            ? "No shared exercises match those filters."
            : "The shared library is empty."
        }
        items={filtered.shared}
        note="Shared exercises are read-only. You can add them to workouts, but you can’t edit or delete them."
      />
    </div>
  );
}

function FilterSelect({
  id,
  label,
  value,
  options,
  onChange,
}: {
  id: string;
  label: string;
  value: string;
  options: string[];
  onChange: (value: string) => void;
}) {
  return (
    <div className="space-y-2">
      <Label htmlFor={id}>{label}</Label>
      <NativeSelect id={id} value={value} onChange={(event) => onChange(event.target.value)}>
        <option value="">All</option>
        {options.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </NativeSelect>
    </div>
  );
}

function ExerciseSection({
  title,
  empty,
  items,
  editable = false,
  note,
}: {
  title: string;
  empty: string;
  items: LibraryExercise[];
  editable?: boolean;
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
            <ExerciseCard key={exercise.id} exercise={exercise} editable={editable} />
          ))}
        </div>
      )}
    </section>
  );
}

function ExerciseCard({ exercise, editable }: { exercise: LibraryExercise; editable: boolean }) {
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(false);
  const details = [exercise.category, exercise.muscle_group, exercise.equipment].filter(Boolean).join(" · ");

  return (
    <Card>
      <CardContent className="py-4">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="font-medium text-foreground">{exercise.name}</p>
            <p className="mt-1 text-sm text-muted-foreground">{details || "No details yet"}</p>
          </div>
          <div className="flex shrink-0 items-center gap-1">
            <Button type="button" variant="ghost" size="sm" onClick={() => setOpen((current) => !current)}>
              {open ? "Hide" : "Details"}
            </Button>
            {editable && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => {
                  setEditing((current) => !current);
                  setOpen(true);
                }}
              >
                {editing ? "Close" : "Edit"}
              </Button>
            )}
            {editable && <DeleteExerciseButton exerciseId={exercise.id} name={exercise.name} />}
          </div>
        </div>
        {open && !editing && (
          <p className="mt-3 text-sm text-muted-foreground">
            {exercise.instructions?.trim() || "No instructions yet."}
          </p>
        )}
        {editing && <ExerciseEditor exercise={exercise} onDone={() => setEditing(false)} />}
      </CardContent>
    </Card>
  );
}

function uniqueValues(items: LibraryExercise[], key: "muscle_group" | "equipment" | "category") {
  return Array.from(new Set(items.map((item) => item[key]).filter((value): value is string => Boolean(value)))).sort(
    (a, b) => a.localeCompare(b)
  );
}
