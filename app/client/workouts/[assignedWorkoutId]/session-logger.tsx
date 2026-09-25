"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { parseOptionalNumber } from "@/lib/workouts/set-input";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export type LoggerLine = {
  id: string;
  name: string;
  sets: number;
  reps: string;
  weight: string | null;
  rest_seconds: number | null;
  notes: string | null;
};

export type LoggerSet = {
  workout_exercise_id: string;
  set_number: number;
  reps: number | null;
  weight: number | null;
  notes: string | null;
};

function sessionIdFromRpc(data: unknown): string {
  if (data && typeof data === "object" && !Array.isArray(data) && "id" in data) {
    const id = (data as { id: unknown }).id;
    if (typeof id === "string" && id.length > 0) return id;
  }
  if (Array.isArray(data) && data[0] && typeof data[0] === "object" && "id" in data[0]) {
    const id = (data[0] as { id: unknown }).id;
    if (typeof id === "string" && id.length > 0) return id;
  }
  throw new Error("Could not start session");
}

function describeError(error: { message?: string; details?: string; hint?: string; code?: string }) {
  const parts = [error.message, error.details, error.hint, error.code].filter(
    (part): part is string => Boolean(part && part.trim())
  );
  return parts.join(" — ") || "The request failed.";
}

export function SessionLogger({
  assignmentId,
  sessionId,
  completed,
  lines,
  logs,
}: {
  assignmentId: string;
  sessionId: string | null;
  completed: boolean;
  lines: LoggerLine[];
  logs: LoggerSet[];
}) {
  const router = useRouter();
  const [activeSessionId, setActiveSessionId] = useState(sessionId);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [savingKey, setSavingKey] = useState<string | null>(null);
  const [savedKey, setSavedKey] = useState<string | null>(null);
  const [completing, setCompleting] = useState(false);
  const [done, setDone] = useState(completed);
  const [localLogs, setLocalLogs] = useState(logs);

  useEffect(() => {
    setLocalLogs(logs);
  }, [logs]);

  const logMap = useMemo(() => {
    const map = new Map<string, LoggerSet>();
    for (const log of localLogs) {
      map.set(`${log.workout_exercise_id}:${log.set_number}`, log);
    }
    return map;
  }, [localLogs]);

  async function ensureSession() {
    if (activeSessionId) return activeSessionId;
    const supabase = createClient();
    const { data, error: startError } = await supabase.rpc("start_or_get_workout_session", {
      p_assigned_workout_id: assignmentId,
    });
    if (startError || !data) {
      throw new Error(startError?.message ?? "Could not start session");
    }
    const id = sessionIdFromRpc(data);
    setActiveSessionId(id);
    return id;
  }

  async function saveSet(
    line: LoggerLine,
    setNumber: number,
    reps: string,
    weight: string,
    notes: string
  ) {
    setError(null);
    setNotice(null);
    const key = `${line.id}:${setNumber}`;
    setSavingKey(key);
    const repsValue = parseOptionalNumber(reps, "reps");
    const weightValue = parseOptionalNumber(weight, "weight");
    if (!repsValue.ok) {
      setError(repsValue.message);
      setSavingKey(null);
      return;
    }
    if (!weightValue.ok) {
      setError(weightValue.message);
      setSavingKey(null);
      return;
    }
    try {
      const supabase = createClient();
      const { data, error: saveError } = await supabase.rpc("save_workout_set", {
        p_assigned_workout_id: assignmentId,
        p_workout_exercise_id: line.id,
        p_set_number: setNumber,
        p_reps: repsValue.value,
        p_weight: weightValue.value,
        p_notes: notes.trim() || null,
      });
      if (saveError) {
        setError(describeError(saveError));
        return;
      }
      if (!data) {
        setError("Save returned no set. The value was not stored.");
        return;
      }
      const saved: LoggerSet = {
        workout_exercise_id: data.workout_exercise_id,
        set_number: data.set_number,
        reps: data.reps == null ? null : Number(data.reps),
        weight: data.weight == null ? null : Number(data.weight),
        notes: data.notes,
      };
      setLocalLogs((current) => {
        const next = current.filter(
          (log) =>
            !(
              log.workout_exercise_id === saved.workout_exercise_id &&
              log.set_number === saved.set_number
            )
        );
        next.push(saved);
        return next;
      });
      setSavedKey(key);
      setNotice(`Set ${setNumber} saved.`);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save that set.");
    } finally {
      setSavingKey(null);
    }
  }

  async function completeSession() {
    setError(null);
    setCompleting(true);
    try {
      const session = await ensureSession();
      const supabase = createClient();
      const { error: completeError } = await supabase.rpc("complete_workout_session", {
        p_session_id: session,
      });
      if (completeError) {
        setError(describeError(completeError));
        return;
      }
      setDone(true);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not complete this workout.");
    } finally {
      setCompleting(false);
    }
  }

  return (
    <div className="space-y-4">
      {done && (
        <div className="rounded-md border border-border bg-muted px-3 py-2 text-sm text-muted-foreground">
          This workout is complete. The sets below are saved and can’t be edited.
        </div>
      )}
      {error && (
        <div role="alert" className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </div>
      )}
      {notice && !error && (
        <div className="rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
          {notice}
        </div>
      )}

      {lines.map((line) => (
        <Card key={line.id}>
          <CardContent className="space-y-4 pt-6">
            <div>
              <p className="font-medium text-foreground">{line.name}</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Prescribed: {line.sets} × {line.reps}
                {line.weight ? ` · ${line.weight}` : ""}
                {line.rest_seconds != null ? ` · ${line.rest_seconds}s rest` : ""}
              </p>
              {line.notes && <p className="mt-2 text-sm text-muted-foreground">{line.notes}</p>}
            </div>

            <div className="space-y-3">
              {Array.from({ length: line.sets }, (_, index) => {
                const setNumber = index + 1;
                const existing = logMap.get(`${line.id}:${setNumber}`);
                return (
                  <SetRow
                    key={setNumber}
                    setNumber={setNumber}
                    defaultReps={existing?.reps?.toString() ?? ""}
                    defaultWeight={existing?.weight?.toString() ?? ""}
                    defaultNotes={existing?.notes ?? ""}
                    disabled={done}
                    saving={savingKey === `${line.id}:${setNumber}`}
                    saved={savedKey === `${line.id}:${setNumber}`}
                    onSave={(reps, weight, notes) => saveSet(line, setNumber, reps, weight, notes)}
                  />
                );
              })}
            </div>
          </CardContent>
        </Card>
      ))}

      <div className="flex justify-end">
        <Button type="button" onClick={completeSession} disabled={done || completing}>
          {done ? "Completed" : completing ? "Completing..." : "Complete workout"}
        </Button>
      </div>
    </div>
  );
}

function SetRow({
  setNumber,
  defaultReps,
  defaultWeight,
  defaultNotes,
  disabled,
  saving,
  saved,
  onSave,
}: {
  setNumber: number;
  defaultReps: string;
  defaultWeight: string;
  defaultNotes: string;
  disabled: boolean;
  saving: boolean;
  saved: boolean;
  onSave: (reps: string, weight: string, notes: string) => void;
}) {
  const [reps, setReps] = useState(defaultReps);
  const [weight, setWeight] = useState(defaultWeight);
  const [notes, setNotes] = useState(defaultNotes);

  useEffect(() => {
    setReps(defaultReps);
    setWeight(defaultWeight);
    setNotes(defaultNotes);
  }, [defaultReps, defaultWeight, defaultNotes]);

  return (
    <div className="grid gap-3 rounded-md border border-border p-3 sm:grid-cols-[3rem_1fr_1fr_1fr_auto] sm:items-end">
      <p className="text-sm font-medium text-muted-foreground">Set {setNumber}</p>
      <div className="space-y-1">
        <Label className="text-xs">Reps</Label>
        <Input value={reps} onChange={(e) => setReps(e.target.value)} disabled={disabled} />
      </div>
      <div className="space-y-1">
        <Label className="text-xs">Weight</Label>
        <Input value={weight} onChange={(e) => setWeight(e.target.value)} disabled={disabled} />
      </div>
      <div className="space-y-1">
        <Label className="text-xs">Notes</Label>
        <Input value={notes} onChange={(e) => setNotes(e.target.value)} disabled={disabled} />
      </div>
      <Button
        type="button"
        size="sm"
        variant="outline"
        className="h-11 w-full sm:h-9 sm:w-auto"
        disabled={disabled || saving}
        onClick={() => onSave(reps, weight, notes)}
      >
        {saving ? "Saving..." : saved ? "Saved" : "Save"}
      </Button>
    </div>
  );
}
