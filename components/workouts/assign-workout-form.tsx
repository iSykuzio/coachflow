"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { assignWorkoutSchema } from "@/lib/validations/workouts";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/ui/native-select";

type Option = { id: string; name: string };

function friendlyAssignError(message: string): string {
  const known = [
    "Add at least one exercise before assigning this workout",
    "You can only assign workouts to your active clients",
    "Workout not found",
    "Only trainers can assign workouts",
    "Not authenticated",
  ];
  return known.find((item) => message.includes(item)) ?? "We couldn’t assign that workout. Please try again.";
}

export function AssignWorkoutForm({
  clients,
  workouts,
  defaultClientId,
  defaultWorkoutId,
  blockedReason,
}: {
  clients: Option[];
  workouts: Option[];
  defaultClientId?: string;
  defaultWorkoutId?: string;
  blockedReason?: string;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [clientId, setClientId] = useState(defaultClientId ?? clients[0]?.id ?? "");
  const [workoutId, setWorkoutId] = useState(defaultWorkoutId ?? workouts[0]?.id ?? "");
  const [dueDate, setDueDate] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const canAssign = clients.length > 0 && workouts.length > 0 && !blockedReason;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    const parsed = assignWorkoutSchema.safeParse({
      clientId,
      workoutId,
      dueDate,
    });
    if (!parsed.success) {
      setError(parsed.error.errors[0].message);
      return;
    }

    setLoading(true);
    const supabase = createClient();
    const { error: assignError } = await supabase.rpc("assign_workout", {
      p_workout_id: parsed.data.workoutId,
      p_client_id: parsed.data.clientId,
      p_due_date: parsed.data.dueDate ? parsed.data.dueDate : null,
    });
    setLoading(false);

    if (assignError) {
      setError(friendlyAssignError(assignError.message));
      return;
    }

    setOpen(false);
    setSuccess("Workout assigned.");
    router.refresh();
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button
          type="button"
          disabled={!canAssign}
          onClick={() => {
            setOpen((current) => !current);
            setError(null);
          }}
        >
          {open ? "Cancel" : "Assign workout"}
        </Button>
      </div>

      {!canAssign && (
        <p className="text-sm text-muted-foreground">
          {blockedReason
            ? blockedReason
            : clients.length === 0
              ? "You need an active client before you can assign a workout."
              : "Create a workout with at least one exercise first."}
        </p>
      )}

      {success && (
        <div className="rounded-md bg-success/10 px-3 py-2 text-sm text-success">{success}</div>
      )}

      {open && canAssign && (
        <Card>
          <CardContent className="pt-6">
            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <div className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
                  {error}
                </div>
              )}
              {!defaultClientId && (
                <div className="space-y-2">
                  <Label htmlFor="assign-client">Client</Label>
                  <NativeSelect
                    id="assign-client"
                    value={clientId}
                    onChange={(e) => setClientId(e.target.value)}
                  >
                    {clients.map((client) => (
                      <option key={client.id} value={client.id}>
                        {client.name}
                      </option>
                    ))}
                  </NativeSelect>
                </div>
              )}
              {!defaultWorkoutId && (
                <div className="space-y-2">
                  <Label htmlFor="assign-workout">Workout</Label>
                  <NativeSelect
                    id="assign-workout"
                    value={workoutId}
                    onChange={(e) => setWorkoutId(e.target.value)}
                  >
                    {workouts.map((workout) => (
                      <option key={workout.id} value={workout.id}>
                        {workout.name}
                      </option>
                    ))}
                  </NativeSelect>
                </div>
              )}
              <div className="space-y-2">
                <Label htmlFor="assign-due">Due date (optional)</Label>
                <Input
                  id="assign-due"
                  type="date"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                />
              </div>
              <div className="flex justify-end">
                <Button type="submit" disabled={loading}>
                  {loading ? "Assigning..." : "Assign"}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
