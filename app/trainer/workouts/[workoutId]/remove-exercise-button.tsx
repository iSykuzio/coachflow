"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";

export function RemoveExerciseButton({ lineId }: { lineId: string }) {
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
