"use client";

import { useMemo, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { DeleteExerciseButton } from "./delete-exercise-button";
import { ExerciseEditor, type FieldSuggestions } from "./exercise-form";

export type LibraryExercise = {
  id: string;
  name: string;
  category: string | null;
  muscle_group: string | null;
  equipment: string | null;
  instructions: string | null;
};

const BROWSE_GROUPS = ["All", "Chest", "Back", "Shoulders", "Arms", "Legs & Glutes", "Core", "Conditioning"] as const;
type BrowseGroup = (typeof BROWSE_GROUPS)[number];

export function ExerciseLibrary({
  custom,
  shared,
  suggestions,
}: {
  custom: LibraryExercise[];
  shared: LibraryExercise[];
  suggestions: FieldSuggestions;
}) {
  const [query, setQuery] = useState("");
  const [mineOpen, setMineOpen] = useState(false);
  const [libraryOpen, setLibraryOpen] = useState(false);
  const [group, setGroup] = useState<BrowseGroup>("All");
  const searching = query.trim().length > 0;

  function onSearch(value: string) {
    const starting = query.trim().length === 0 && value.trim().length > 0;
    setQuery(value);
    if (starting) {
      setMineOpen(true);
      setLibraryOpen(true);
    }
  }

  const filteredMine = useMemo(() => custom.filter((item) => matchesQuery(item, query)), [custom, query]);
  const groupCounts = useMemo(() => {
    const counts = new Map<BrowseGroup, number>(BROWSE_GROUPS.map((item) => [item, 0]));
    counts.set("All", shared.length);
    for (const exercise of shared) {
      const browseGroup = browseGroupFor(exercise);
      if (browseGroup) counts.set(browseGroup, (counts.get(browseGroup) ?? 0) + 1);
    }
    return counts;
  }, [shared]);
  const filteredShared = useMemo(
    () => shared.filter((item) => matchesQuery(item, query) && inBrowseGroup(item, group)),
    [shared, query, group],
  );

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="exercise-search">Search</Label>
        <Input
          id="exercise-search"
          value={query}
          onChange={(event) => onSearch(event.target.value)}
          placeholder="Search exercises..."
        />
      </div>
      <LibrarySection
        title="My Exercises"
        count={custom.length}
        description="Exercises you've created for your own programs."
        open={mineOpen}
        onToggle={() => setMineOpen((current) => !current)}
      >
        <ExerciseList
          items={filteredMine}
          editable
          suggestions={suggestions}
          empty={
            searching
              ? "No personal exercises match that search."
              : "No personal exercises yet. Add one above, or type a new movement while building a workout."
          }
        />
      </LibrarySection>
      <LibrarySection
        title="CoachFlow Library"
        count={shared.length}
        description="Ready-to-use exercises included with CoachFlow."
        open={libraryOpen}
        onToggle={() => setLibraryOpen((current) => !current)}
      >
        <div className="flex flex-wrap gap-2">
          {BROWSE_GROUPS.map((item) => (
            <Button
              key={item}
              type="button"
              size="sm"
              variant={group === item ? "default" : "outline"}
              onClick={() => setGroup(item)}
            >
              {item} ({groupCounts.get(item) ?? 0})
            </Button>
          ))}
        </div>
        <ExerciseList
          items={filteredShared}
          empty={searching ? "No CoachFlow exercises match that search." : "No exercises in this group."}
        />
      </LibrarySection>
    </div>
  );
}

function LibrarySection({
  title,
  count,
  description,
  open,
  onToggle,
  children,
}: {
  title: string;
  count: number;
  description: string;
  open: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-lg border border-border">
      <button
        type="button"
        className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left"
        aria-expanded={open}
        onClick={onToggle}
      >
        <span>
          <span className="block font-medium text-foreground">
            {title} ({count})
          </span>
          <span className="mt-1 block text-sm text-muted-foreground">{description}</span>
        </span>
        <span className="shrink-0 text-sm text-muted-foreground">{open ? "Collapse" : "Expand"}</span>
      </button>
      {open && <div className="space-y-3 border-t border-border px-4 py-4">{children}</div>}
    </section>
  );
}

function ExerciseList({
  items,
  empty,
  editable = false,
  suggestions,
}: {
  items: LibraryExercise[];
  empty: string;
  editable?: boolean;
  suggestions?: FieldSuggestions;
}) {
  if (items.length === 0) {
    return <p className="text-sm text-muted-foreground">{empty}</p>;
  }
  return (
    <div className="grid gap-3">
      {items.map((exercise) => (
        <ExerciseCard key={exercise.id} exercise={exercise} editable={editable} suggestions={suggestions} />
      ))}
    </div>
  );
}

function ExerciseCard({
  exercise,
  editable,
  suggestions,
}: {
  exercise: LibraryExercise;
  editable: boolean;
  suggestions?: FieldSuggestions;
}) {
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
          <p className="mt-3 text-sm text-muted-foreground">{exercise.instructions?.trim() || "No instructions yet."}</p>
        )}
        {editing && suggestions && (
          <ExerciseEditor exercise={exercise} suggestions={suggestions} onDone={() => setEditing(false)} />
        )}
      </CardContent>
    </Card>
  );
}

function matchesQuery(item: LibraryExercise, query: string) {
  const needle = query.trim().toLowerCase();
  if (!needle) return true;
  return [item.name, item.category, item.muscle_group, item.equipment, item.instructions]
    .filter(Boolean)
    .some((value) => value!.toLowerCase().includes(needle));
}

function browseGroupFor(exercise: LibraryExercise): Exclude<BrowseGroup, "All"> | null {
  const muscle = exercise.muscle_group?.trim().toLowerCase() ?? "";
  const category = exercise.category?.trim().toLowerCase() ?? "";
  if (category === "conditioning" || category === "cardio") return "Conditioning";
  if (muscle === "chest") return "Chest";
  if (muscle === "back") return "Back";
  if (muscle === "shoulders") return "Shoulders";
  if (muscle === "biceps" || muscle === "triceps" || muscle === "forearms" || muscle === "arms") return "Arms";
  if (["quads", "hamstrings", "glutes", "calves", "hips", "legs", "posterior chain"].includes(muscle)) {
    return "Legs & Glutes";
  }
  if (muscle === "core" || category === "core") return "Core";
  return null;
}

function inBrowseGroup(exercise: LibraryExercise, group: BrowseGroup) {
  if (group === "All") return true;
  return browseGroupFor(exercise) === group;
}
