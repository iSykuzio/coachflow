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
  name: string;
  sets: string;
  reps: string;
  weight: string;
  restSeconds: string;
  notes: string;
};

function blankLine(): DraftLine {
  return {
    key: crypto.randomUUID(),
    name: "",
    sets: "3",
    reps: "8-12",
    weight: "",
    restSeconds: "90",
    notes: "",
  };
}

function displayName(value: string) {
  return value.trim().replace(/\s+/g, " ");
}

function nameKey(value: string) {
  return displayName(value).toLowerCase();
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

    const prepared = lines
      .map((line) => ({ ...line, name: displayName(line.name) }))
      .filter((line) => line.name.length > 0);

    if (prepared.length === 0) {
      setError("Type at least one exercise.");
      return;
    }

    for (const line of prepared) {
      if (line.name.length < 2) {
        setError("Each exercise name needs at least 2 characters.");
        return;
      }
      const parsed = workoutExerciseSchema.safeParse({
        exerciseId: crypto.randomUUID(),
        sets: line.sets,
        reps: line.reps,
        weight: line.weight,
        restSeconds: line.restSeconds,
        notes: line.notes,
      });
      if (!parsed.success) {
        setError(`${line.name}: ${parsed.error.errors[0].message}`);
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

    const known = [...exercises];
    const createdIds: string[] = [];
    let workoutId: string | null = null;
    let linesSaved = false;

    try {
      const exerciseIds: string[] = [];
      for (const line of prepared) {
        const key = nameKey(line.name);
        const matches = known.filter((item) => nameKey(item.name) === key);
        const existing = matches.find((item) => item.trainer_id === user.id) ?? matches[0];
        if (existing) {
          exerciseIds.push(existing.id);
          continue;
        }

        const { data, error: insertError } = await supabase
          .from("exercises")
          .insert({ trainer_id: user.id, name: line.name, is_custom: true })
          .select("id, name, trainer_id")
          .single();
        if (insertError || !data) throw new Error(insertError?.message || `Couldn’t save ${line.name}.`);
        known.push(data);
        createdIds.push(data.id);
        exerciseIds.push(data.id);
      }

      const { data: workout, error: workoutError } = await supabase
        .from("workouts")
        .insert({ trainer_id: user.id, name: parsedName.data.name, description: null })
        .select("id")
        .single();
      if (workoutError || !workout) throw new Error(workoutError?.message || "The workout was not created.");
      workoutId = workout.id;

      const rows = prepared.map((line, index) => {
        const parsed = workoutExerciseSchema.parse({
          exerciseId: exerciseIds[index],
          sets: line.sets,
          reps: line.reps,
          weight: line.weight,
          restSeconds: line.restSeconds,
          notes: line.notes,
        });
        return {
          workout_id: workout.id,
          exercise_id: exerciseIds[index],
          order_index: index,
          sets: parsed.sets,
          reps: parsed.reps,
          weight: parsed.weight || null,
          rest_seconds: parsed.restSeconds ?? null,
          notes: parsed.notes || null,
        };
      });

      const { error: lineError } = await supabase.from("workout_exercises").insert(rows);
      if (lineError) throw new Error(lineError.message);
      linesSaved = true;

      if (assign) {
        const { error: assignError } = await supabase.rpc("assign_workout", {
          p_workout_id: workout.id,
          p_client_id: clientId,
          p_due_date: null,
        });
        if (assignError) throw new Error(assignError.message);
      }
    } catch (caught) {
      if (!linesSaved) {
        if (workoutId) await supabase.from("workouts").delete().eq("id", workoutId);
        if (createdIds.length > 0) await supabase.from("exercises").delete().in("id", createdIds);
        setLoading(null);
        setError(caught instanceof Error ? caught.message : "The workout was not saved.");
        return;
      }
      setLoading(null);
      setError(caught instanceof Error ? caught.message : "The workout was saved, but it could not be assigned.");
      if (workoutId) {
        router.push(`/trainer/workouts/${workoutId}`);
        router.refresh();
      }
      return;
    }

    setLoading(null);
    if (workoutId) {
      router.push(`/trainer/workouts/${workoutId}`);
      router.refresh();
    }
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
              <h2 className="text-base font-semibold tracking-tight">Create workout</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Type the full session on this page. Suggestions are optional. Nothing is saved until you press Save.
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
                  library={exercises}
                  onChange={(patch) => updateLine(line.key, patch)}
                  onMove={(direction) => move(index, direction)}
                  onRemove={() =>
                    setLines((current) => {
                      const next = current.filter((item) => item.key !== line.key);
                      return next.length > 0 ? next : [blankLine()];
                    })
                  }
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
  const needle = nameKey(line.name);
  const suggestions =
    needle.length === 0
      ? []
      : library.filter((item) => nameKey(item.name).includes(needle) && nameKey(item.name) !== needle).slice(0, 6);

  return (
    <div className="space-y-4 rounded-lg border border-border p-4">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm font-medium text-foreground">{index + 1}.</p>
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
        <Label htmlFor={`name-${line.key}`}>Exercise</Label>
        <Input
          id={`name-${line.key}`}
          value={line.name}
          onChange={(event) => onChange({ name: event.target.value })}
          placeholder="Romanian deadlift"
        />
        {suggestions.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {suggestions.map((item) => (
              <Button
                key={item.id}
                type="button"
                size="sm"
                variant="outline"
                onClick={() => onChange({ name: item.name })}
              >
                {item.trainer_id ? "My exercise" : "CoachFlow"} · {item.name}
              </Button>
            ))}
          </div>
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
