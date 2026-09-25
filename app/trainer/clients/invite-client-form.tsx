"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { inviteClientSchema } from "@/lib/validations/clients";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

function friendlyInviteError(message: string): string {
  const known = [
    "Enter the client's full name",
    "Enter a valid email address",
    "That email belongs to a trainer account",
    "This person is already on your roster",
    "This client is already connected to another trainer",
    "You already have a pending invitation for this email",
    "Only trainers can invite clients",
    "Not authenticated",
  ];

  return known.find((item) => message.includes(item)) ?? "We couldn’t send that invitation. Please try again.";
}

export function InviteClientForm() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  function resetForm() {
    setFullName("");
    setEmail("");
    setError(null);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    const parsed = inviteClientSchema.safeParse({ fullName, email });
    if (!parsed.success) {
      setError(parsed.error.errors[0].message);
      return;
    }

    setLoading(true);
    const supabase = createClient();
    const { error: inviteError } = await supabase.rpc(
      "invite_client",
      {
        p_full_name: parsed.data.fullName,
        p_email: parsed.data.email,
      } as never
    );
    setLoading(false);

    if (inviteError) {
      setError(friendlyInviteError(inviteError.message));
      return;
    }

    resetForm();
    setOpen(false);
    setSuccess(
      `Invitation sent to ${parsed.data.email}. Ask them to sign up or log in with that email as a client.`
    );
    router.refresh();
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button
          type="button"
          onClick={() => {
            setOpen((current) => !current);
            setError(null);
          }}
        >
          {open ? "Cancel" : "Invite client"}
        </Button>
      </div>

      {success && (
        <div className="rounded-md bg-success/10 px-3 py-2 text-sm text-success">
          {success}
        </div>
      )}

      {open && (
        <Card>
          <CardContent className="pt-6">
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <h2 className="text-base font-semibold tracking-tight">Invite a client</h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  They’ll appear under Invited until they sign up or log in with this email.
                </p>
              </div>

              {error && (
                <div className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
                  {error}
                </div>
              )}

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="invite-full-name">Full name</Label>
                  <Input
                    id="invite-full-name"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="Alex Morgan"
                    autoComplete="name"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="invite-email">Email</Label>
                  <Input
                    id="invite-email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="alex@example.com"
                    autoComplete="email"
                  />
                </div>
              </div>

              <div className="flex justify-end">
                <Button type="submit" disabled={loading}>
                  {loading ? "Sending invitation..." : "Send invitation"}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
