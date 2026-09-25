import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Card, CardContent } from "@/components/ui/card";
import { PendingInvitations, type PendingInvitation } from "./pending-invitations";

type ProfileSummary = {
  full_name: string;
};

type TrainerLink = {
  trainer_id: string;
  status: string;
};

export default async function ClientDashboardPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("full_name")
    .eq("id", user.id)
    .maybeSingle()
    .overrideTypes<ProfileSummary | null, { merge: false }>();

  const { data: trainerLink, error: trainerLinkError } = await supabase
    .from("trainer_clients")
    .select("trainer_id, status")
    .eq("client_id", user.id)
    .eq("status", "active")
    .maybeSingle()
    .overrideTypes<TrainerLink | null, { merge: false }>();

  if (profileError || trainerLinkError) {
    redirect("/login");
  }

  const { data: pendingInvites } = trainerLink
    ? { data: [] as PendingInvitation[] }
    : await supabase.rpc("list_my_pending_invitations");

  const invitations = (pendingInvites ?? []) as PendingInvitation[];

  return (
    <div>
      <h1 className="text-2xl font-semibold tracking-tight">
        Hey, {profile?.full_name?.split(" ")[0] ?? "there"}
      </h1>
      <p className="mt-1 text-sm text-muted-foreground">
        {trainerLink
          ? "You're connected with your trainer. Today's workout will show up here."
          : invitations.length > 1
            ? "More than one trainer invited you. Choose who you want to train with."
            : invitations.length === 1
              ? "A trainer invited you. Connect to start training with them."
              : "You're not linked to a trainer yet — once they invite you, your workouts will show up here."}
      </p>

      {!trainerLink && invitations.length > 0 && (
        <PendingInvitations invitations={invitations} />
      )}

      <Card className="mt-6">
        <CardContent className="py-10 text-center text-sm text-muted-foreground">
          Assigned workouts and logging will show up here once your trainer sends one.
        </CardContent>
      </Card>
    </div>
  );
}
