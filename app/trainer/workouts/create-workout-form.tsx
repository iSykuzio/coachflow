"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { workoutSchema } from "@/lib/validations/workouts";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

export function CreateWorkoutForm() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    const parsed = workoutSchema.safeParse({ name, description });
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

    const { data, error: insertError } = await supabase
      .from("workouts")
      .insert({
        trainer_id: user.id,
        name: parsed.data.name,
        description: parsed.data.description || null,
      })
      .select("id")
      .single();
    setLoading(false);

    if (insertError || !data) {
      setError("We couldn’t create that workout. Please try again.");
      return;
    }

    router.push(`/trainer/workouts/${data.id}`);
    router.refresh();
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button type="button" onClick={() => setOpen((current) => !current)}>
          {open ? "Cancel" : "Create workout"}
        </Button>
      </div>

      {open && (
        <Card>
          <CardContent className="pt-6">
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <h2 className="text-base font-semibold tracking-tight">New workout</h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  Name it, then add exercises on the next screen.
                </p>
              </div>
              {error && (
                <div className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
                  {error}
                </div>
              )}
              <div className="space-y-2">
                <Label htmlFor="workout-name">Name</Label>
                <Input
                  id="workout-name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Lower body A"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="workout-description">Description</Label>
                <Textarea
                  id="workout-description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Optional notes for you and your client"
                  rows={3}
                />
              </div>
              <div className="flex justify-end">
                <Button type="submit" disabled={loading}>
                  {loading ? "Creating..." : "Create and add exercises"}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
