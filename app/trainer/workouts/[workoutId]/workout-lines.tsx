"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { workoutExerciseSchema } from "@/lib/validations/workouts";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

export type WorkoutLine = {
  id: string;
  order_index: number;
  sets: number;
  reps: string;
  weight: string | null;
  rest_seconds: number | null;
  notes: string | null;
  exerciseId: string;
  name: string;
};

export function WorkoutLines({ lines }: { lines: WorkoutLine[] }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pendingId, setPendingId] = useState<string | null>(null);

  async function move(index: number, direction: -1 | 1) {
    const nextIndex = index + direction;
    if (nextIndex < 0 || nextIndex >= lines.length) return;
    const order = [...lines];
    const [item] = order.splice(index, 1);
    order.splice(nextIndex, 0, item);
    setError(null);
    setPendingId(item.id);
    const supabase = createClient();
    const results = await Promise.all(
      order.map((line, position) =>
        supabase.from("workout_exercises").update({ order_index: position }).eq("id", line.id)
      )
    );
    setPendingId(null);
    if (results.some((result) => result.error)) {
      setError("Couldn’t reorder that exercise.");
      return;
    }
    router.refresh();
  }

  return (
    <div className="grid gap-3">
      {error && <div className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</div>}
      {lines.map((line, index) => (
        <WorkoutLineCard
          key={line.id}
          line={line}
          index={index}
          total={lines.length}
          pending={pendingId === line.id}
          onMove={move}
        />
      ))}
    </div>
  );
}

function WorkoutLineCard({
  line,
  index,
  total,
  pending,
  onMove,
}: {
  line: WorkoutLine;
  index: number;
  total: number;
  pending: boolean;
  onMove: (index: number, direction: -1 | 1) => void;
}) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [sets, setSets] = useState(String(line.sets));
  const [reps, setReps] = useState(line.reps);
  const [weight, setWeight] = useState(line.weight ?? "");
  const [restSeconds, setRestSeconds] = useState(line.rest_seconds == null ? "" : String(line.rest_seconds));
  const [notes, setNotes] = useState(line.notes ?? "");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const parsed = workoutExerciseSchema.safeParse({
      exerciseId: line.exerciseId,
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
    const { error: updateError } = await supabase
      .from("workout_exercises")
      .update({
        sets: parsed.data.sets,
        reps: parsed.data.reps,
        weight: parsed.data.weight || null,
        rest_seconds: parsed.data.restSeconds ?? null,
        notes: parsed.data.notes || null,
      })
      .eq("id", line.id);
    setLoading(false);
    if (updateError) {
      setError(updateError.message || "Couldn’t save that exercise.");
      return;
    }
    setEditing(false);
    router.refresh();
  }

  return (
    <Card>
      <CardContent className="py-4">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="font-medium text-foreground">
              {index + 1}. {line.name}
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
              {line.sets} × {line.reps}
              {line.weight ? ` · ${line.weight}` : ""}
              {line.rest_seconds != null ? ` · ${line.rest_seconds}s rest` : ""}
            </p>
            {line.notes && !editing && <p className="mt-2 text-sm text-muted-foreground">{line.notes}</p>}
          </div>
          <div className="flex shrink-0 flex-wrap justify-end gap-1">
            <Button type="button" variant="ghost" size="sm" disabled={pending || index === 0} onClick={() => onMove(index, -1)}>
              Up
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              disabled={pending || index === total - 1}
              onClick={() => onMove(index, 1)}
            >
              Down
            </Button>
            <Button type="button" variant="ghost" size="sm" onClick={() => setEditing((current) => !current)}>
              {editing ? "Close" : "Edit"}
            </Button>
            <RemoveLineButton lineId={line.id} />
          </div>
        </div>
        {editing && (
          <form onSubmit={save} className="mt-4 space-y-4 border-t border-border pt-4">
            {error && <div className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</div>}
            <div className="grid gap-4 sm:grid-cols-4">
              <div className="space-y-2">
                <Label htmlFor={`${line.id}-sets`}>Sets</Label>
                <Input id={`${line.id}-sets`} value={sets} onChange={(e) => setSets(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor={`${line.id}-reps`}>Reps</Label>
                <Input id={`${line.id}-reps`} value={reps} onChange={(e) => setReps(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor={`${line.id}-weight`}>Weight</Label>
                <Input id={`${line.id}-weight`} value={weight} onChange={(e) => setWeight(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor={`${line.id}-rest`}>Rest (sec)</Label>
                <Input id={`${line.id}-rest`} value={restSeconds} onChange={(e) => setRestSeconds(e.target.value)} />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor={`${line.id}-notes`}>Notes</Label>
              <Textarea id={`${line.id}-notes`} value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} />
            </div>
            <div className="flex justify-end">
              <Button type="submit" disabled={loading}>
                {loading ? "Saving..." : "Save exercise"}
              </Button>
            </div>
          </form>
        )}
      </CardContent>
    </Card>
  );
}

function RemoveLineButton({ lineId }: { lineId: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handleRemove() {
    setLoading(true);
    const supabase = createClient();
    await supabase.from("workout_exercises").delete().eq("id", lineId);
    setLoading(false);
    router.refresh();
  }

  return (
    <Button type="button" variant="ghost" size="sm" onClick={handleRemove} disabled={loading}>
      {loading ? "Removing..." : "Remove"}
    </Button>
  );
}
