"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export type PendingInvitation = {
  id: string;
  trainer_id: string;
  trainer_name: string;
  created_at: string;
};

function friendlyAcceptError(message: string): string {
  const known = [
    "This invitation is no longer pending",
    "This invitation does not match your account email",
    "You are already connected to a trainer",
    "Only client accounts can accept invitations",
    "Invitation not found",
    "Not authenticated",
  ];

  return known.find((item) => message.includes(item)) ?? "We couldn’t connect you to that trainer. Please try again.";
}

export function PendingInvitations({ invitations }: { invitations: PendingInvitation[] }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [acceptingId, setAcceptingId] = useState<string | null>(null);

  async function acceptInvitation(invitationId: string) {
    setError(null);
    setAcceptingId(invitationId);

    const supabase = createClient();
    const { error: acceptError } = await supabase.rpc(
      "accept_client_invitation",
      {
        p_invitation_id: invitationId,
      } as never
    );

    setAcceptingId(null);

    if (acceptError) {
      setError(friendlyAcceptError(acceptError.message));
      return;
    }

    router.refresh();
  }

  return (
    <Card className="mt-6">
      <CardContent className="space-y-4 pt-6">
        <div>
          <h2 className="text-base font-semibold tracking-tight">
            {invitations.length > 1 ? "Choose your trainer" : "Trainer invitation"}
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            {invitations.length > 1
              ? "More than one trainer invited this email. Connect with the person you want to train with."
              : "Connect to start training with this coach."}
          </p>
        </div>

        {error && (
          <div className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {error}
          </div>
        )}

        <div className="grid gap-3">
          {invitations.map((invitation) => (
            <div
              key={invitation.id}
              className="flex flex-col gap-3 rounded-lg border border-border px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
            >
              <div>
                <p className="font-medium text-foreground">{invitation.trainer_name}</p>
                <p className="text-sm text-muted-foreground">Pending invitation</p>
              </div>
              <Button
                type="button"
                onClick={() => acceptInvitation(invitation.id)}
                disabled={acceptingId !== null}
              >
                {acceptingId === invitation.id ? "Connecting..." : "Connect"}
              </Button>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
