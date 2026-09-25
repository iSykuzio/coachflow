"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";

export function DeleteExerciseButton({
  exerciseId,
  name,
}: {
  exerciseId: string;
  name: string;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleDelete() {
    setError(null);
    setLoading(true);
    const supabase = createClient();
    const { error: deleteError } = await supabase.from("exercises").delete().eq("id", exerciseId);
    setLoading(false);

    if (deleteError) {
      setError("This exercise is used in a workout, so it can’t be deleted.");
      return;
    }

    router.refresh();
  }

  return (
    <div className="shrink-0 text-right">
      <Button type="button" variant="ghost" size="sm" onClick={handleDelete} disabled={loading}>
        {loading ? "Removing..." : "Remove"}
      </Button>
      {error && (
        <p className="mt-1 max-w-[10rem] text-xs text-destructive" title={name}>
          {error}
        </p>
      )}
    </div>
  );
}
