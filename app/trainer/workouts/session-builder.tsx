"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { workoutExerciseSchema, workoutSchema } from "@/lib/validations/workouts";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/ui/native-select";
import { Textarea } from "@/components/ui/textarea";

type LibraryExercise = { id: string; name: string; trainer_id: string | null };
type ClientOption = { id: string; name: string };

type DraftLine = {
  key: string;
  exerciseId: string | null;
  exerciseName: string;
  query: string;
  sets: string;
  reps: string;
  weight: string;
  restSeconds: string;
  notes: string;
};

function blankLine(): DraftLine {
  return {
    key: crypto.randomUUID(),
    exerciseId: null,
    exerciseName: "",
    query: "",
    sets: "3",
    reps: "8-12",
    weight: "",
    restSeconds: "90",
    notes: "",
  };
}

export function SessionBuilder({
  exercises,
  clients,
}: {
  exercises: LibraryExercise[];
  clients: ClientOption[];
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [library, setLibrary] = useState(exercises);
  const [lines, setLines] = useState<DraftLine[]>([blankLine()]);
  const [clientId, setClientId] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState<"save" | "assign" | null>(null);

  function updateLine(key: string, patch: Partial<DraftLine>) {
    setLines((current) => current.map((line) => (line.key === key ? { ...line, ...patch } : line)));
  }

  function move(index: number, direction: -1 | 1) {
    const next = index + direction;
    if (next < 0 || next >= lines.length) return;
    setLines((current) => {
      const copy = [...current];
      const [item] = copy.splice(index, 1);
      copy.splice(next, 0, item);
      return copy;
    });
  }

  async function ensureExercise(line: DraftLine, trainerId: string) {
    if (line.exerciseId) return line.exerciseId;
    const typed = line.exerciseName.trim();
    const existing = library.find((item) => item.name.toLowerCase() === typed.toLowerCase());
    if (existing) return existing.id;

    const supabase = createClient();
    const { data, error: insertError } = await supabase
      .from("exercises")
      .insert({ trainer_id: trainerId, name: typed, is_custom: true })
      .select("id, name, trainer_id")
      .single();
    if (insertError || !data) throw new Error(insertError?.message || "Couldn’t create that exercise.");
    setLibrary((current) => [...current, data]);
    return data.id;
  }

  async function save(assign: boolean) {
    setError(null);
    const parsedName = workoutSchema.safeParse({ name, description: "" });
    if (!parsedName.success) {
      setError(parsedName.error.errors[0].message);
      return;
    }
    if (assign && !clientId) {
      setError("Choose a client before assigning this workout.");
      return;
    }

    const prepared = lines.filter((line) => line.exerciseId || line.exerciseName.trim());
    if (assign && prepared.length === 0) {
      setError("Add at least one exercise before assigning this workout.");
      return;
    }

    for (const line of prepared) {
      const parsed = workoutExerciseSchema.safeParse({
        exerciseId: line.exerciseId ?? crypto.randomUUID(),
        sets: line.sets,
        reps: line.reps,
        weight: line.weight,
        restSeconds: line.restSeconds,
        notes: line.notes,
      });
      if (!parsed.success) {
        setError(parsed.error.errors[0].message);
        return;
      }
      if (!line.exerciseId && line.exerciseName.trim().length < 2) {
        setError("Choose an exercise or create one with at least 2 characters.");
        return;
      }
    }

    setLoading(assign ? "assign" : "save");
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      setLoading(null);
      setError("Not authenticated");
      return;
    }

    const { data: workout, error: workoutError } = await supabase
      .from("workouts")
      .insert({ trainer_id: user.id, name: parsedName.data.name, description: null })
      .select("id")
      .single();
    if (workoutError || !workout) {
      setLoading(null);
      setError(workoutError?.message ?? "The workout was not created.");
      return;
    }

    try {
      const rows = [];
      for (let index = 0; index < prepared.length; index += 1) {
        const line = prepared[index];
        const exerciseId = await ensureExercise(line, user.id);
        const parsed = workoutExerciseSchema.parse({
          exerciseId,
          sets: line.sets,
          reps: line.reps,
          weight: line.weight,
          restSeconds: line.restSeconds,
          notes: line.notes,
        });
        rows.push({
          workout_id: workout.id,
          exercise_id: exerciseId,
          order_index: index,
          sets: parsed.sets,
          reps: parsed.reps,
          weight: parsed.weight || null,
          rest_seconds: parsed.restSeconds ?? null,
          notes: parsed.notes || null,
        });
      }
      if (rows.length > 0) {
        const { error: lineError } = await supabase.from("workout_exercises").insert(rows);
        if (lineError) throw new Error(lineError.message);
      }
      if (assign) {
        const { error: assignError } = await supabase.rpc("assign_workout", {
          p_workout_id: workout.id,
          p_client_id: clientId,
          p_due_date: null,
        });
        if (assignError) throw new Error(assignError.message);
      }
    } catch (caught) {
      setLoading(null);
      const message = caught instanceof Error ? caught.message : "The workout was saved, but not everything could be added.";
      setError(message);
      router.push(`/trainer/workouts/${workout.id}`);
      router.refresh();
      return;
    }

    setLoading(null);
    router.push(`/trainer/workouts/${workout.id}`);
    router.refresh();
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button type="button" onClick={() => setOpen((current) => !current)}>
          {open ? "Close" : "Create workout"}
        </Button>
      </div>
      {open && (
        <Card>
          <CardContent className="space-y-6 pt-6">
            <div>
              <h2 className="text-base font-semibold tracking-tight">Build the session</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Add every movement for this workout, then save it or assign the whole session to a client.
              </p>
            </div>
            {error && <div className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</div>}
            <div className="space-y-2">
              <Label htmlFor="session-name">Workout name</Label>
              <Input
                id="session-name"
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder="Leg day"
              />
            </div>
            <div className="space-y-3">
              {lines.map((line, index) => (
                <DraftExercise
                  key={line.key}
                  line={line}
                  index={index}
                  total={lines.length}
                  library={library}
                  onChange={(patch) => updateLine(line.key, patch)}
                  onMove={(direction) => move(index, direction)}
                  onRemove={() => setLines((current) => current.filter((item) => item.key !== line.key))}
                />
              ))}
              <Button type="button" variant="outline" onClick={() => setLines((current) => [...current, blankLine()])}>
                + Add exercise
              </Button>
            </div>
            <div className="space-y-2">
              <Label htmlFor="session-client">Assign to</Label>
              <NativeSelect id="session-client" value={clientId} onChange={(event) => setClientId(event.target.value)}>
                <option value="">No client yet</option>
                {clients.map((client) => (
                  <option key={client.id} value={client.id}>
                    {client.name}
                  </option>
                ))}
              </NativeSelect>
              {clients.length === 0 && (
                <p className="text-sm text-muted-foreground">Invite a client before you can assign this workout.</p>
              )}
            </div>
            <div className="flex flex-wrap justify-end gap-2">
              <Button type="button" variant="outline" disabled={loading !== null} onClick={() => save(false)}>
                {loading === "save" ? "Saving..." : "Save workout"}
              </Button>
              <Button type="button" disabled={loading !== null || !clientId} onClick={() => save(true)}>
                {loading === "assign" ? "Assigning..." : "Save & assign"}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function DraftExercise({
  line,
  index,
  total,
  library,
  onChange,
  onMove,
  onRemove,
}: {
  line: DraftLine;
  index: number;
  total: number;
  library: LibraryExercise[];
  onChange: (patch: Partial<DraftLine>) => void;
  onMove: (direction: -1 | 1) => void;
  onRemove: () => void;
}) {
  const needle = line.query.trim().toLowerCase();
  const matches = needle
    ? library.filter((item) => item.name.toLowerCase().includes(needle)).slice(0, 8)
    : [];
  const exact = library.some((item) => item.name.toLowerCase() === needle);
  const chosen = line.exerciseName || (line.exerciseId ? library.find((item) => item.id === line.exerciseId)?.name : "");

  return (
    <div className="space-y-4 rounded-lg border border-border p-4">
      <div className="flex items-start justify-between gap-3">
        <p className="text-sm font-medium text-foreground">{index + 1}. {chosen || "Exercise"}</p>
        <div className="flex gap-1">
          <Button type="button" variant="ghost" size="sm" disabled={index === 0} onClick={() => onMove(-1)}>
            Up
          </Button>
          <Button type="button" variant="ghost" size="sm" disabled={index === total - 1} onClick={() => onMove(1)}>
            Down
          </Button>
          <Button type="button" variant="ghost" size="sm" onClick={onRemove}>
            Remove
          </Button>
        </div>
      </div>
      <div className="space-y-2">
        <Label htmlFor={`find-${line.key}`}>Movement</Label>
        <Input
          id={`find-${line.key}`}
          value={line.query}
          onChange={(event) => onChange({ query: event.target.value, exerciseId: null, exerciseName: "" })}
          placeholder="Search or type a new movement"
        />
        {matches.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {matches.map((item) => (
              <Button
                key={item.id}
                type="button"
                size="sm"
                variant={line.exerciseId === item.id ? "default" : "outline"}
                onClick={() => onChange({ exerciseId: item.id, exerciseName: item.name, query: item.name })}
              >
                {item.name}
              </Button>
            ))}
          </div>
        )}
        {needle.length >= 2 && !exact && (
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() => onChange({ exerciseId: null, exerciseName: line.query.trim(), query: line.query.trim() })}
          >
            + Create “{line.query.trim()}”
          </Button>
        )}
      </div>
      <div className="grid gap-4 sm:grid-cols-4">
        <div className="space-y-2">
          <Label htmlFor={`sets-${line.key}`}>Sets</Label>
          <Input id={`sets-${line.key}`} value={line.sets} onChange={(event) => onChange({ sets: event.target.value })} />
        </div>
        <div className="space-y-2">
          <Label htmlFor={`reps-${line.key}`}>Reps</Label>
          <Input id={`reps-${line.key}`} value={line.reps} onChange={(event) => onChange({ reps: event.target.value })} />
        </div>
        <div className="space-y-2">
          <Label htmlFor={`weight-${line.key}`}>Weight</Label>
          <Input
            id={`weight-${line.key}`}
            value={line.weight}
            onChange={(event) => onChange({ weight: event.target.value })}
            placeholder="Optional"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor={`rest-${line.key}`}>Rest (sec)</Label>
          <Input
            id={`rest-${line.key}`}
            value={line.restSeconds}
            onChange={(event) => onChange({ restSeconds: event.target.value })}
          />
        </div>
      </div>
      <div className="space-y-2">
        <Label htmlFor={`notes-${line.key}`}>Notes</Label>
        <Textarea
          id={`notes-${line.key}`}
          value={line.notes}
          onChange={(event) => onChange({ notes: event.target.value })}
          rows={2}
          placeholder="Optional"
        />
      </div>
    </div>
  );
}
