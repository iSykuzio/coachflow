import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Card, CardContent } from "@/components/ui/card";
import { initials } from "@/lib/utils";
import { InviteClientForm } from "./invite-client-form";

type ProfileSummary = {
  id: string;
  role: string;
  full_name: string;
};

type ClientLink = {
  client_id: string;
  status: "active" | "invited" | "archived";
};

type ClientProfileSummary = {
  id: string;
  full_name: string | null;
  email: string | null;
  avatar_url: string | null;
};

type PendingInvite = {
  id: string;
  email: string;
  full_name: string;
};

type RosterPerson = {
  key: string;
  full_name: string | null;
  email: string | null;
  href?: string;
};

type ClientStatus = "active" | "invited" | "archived";

const STATUS_LABELS: Record<ClientStatus, string> = {
  active: "Active",
  invited: "Invited",
  archived: "Archived",
};

const orderedStatuses: ClientStatus[] = ["active", "invited", "archived"];

export default async function TrainerClientsPage() {
  const supabase = createClient();

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    redirect("/login");
  }

  const { data: trainerProfile, error: trainerProfileError } = await supabase
    .from("profiles")
    .select("id, role, full_name")
    .eq("id", user.id)
    .maybeSingle()
    .overrideTypes<ProfileSummary | null, { merge: false }>();

  if (trainerProfileError || !trainerProfile) {
    return (
      <Card>
        <CardContent className="py-10 text-center text-sm text-muted-foreground">
          We couldn’t load your trainer profile right now.
        </CardContent>
      </Card>
    );
  }

  if (trainerProfile.role !== "trainer") {
    redirect("/client/dashboard");
  }

  const { data: clientLinks, error: clientLinksError } = await supabase
    .from("trainer_clients")
    .select("client_id, status")
    .eq("trainer_id", trainerProfile.id)
    .overrideTypes<ClientLink[], { merge: false }>();

  if (clientLinksError) {
    return (
      <Card>
        <CardContent className="py-10 text-center text-sm text-muted-foreground">
          We couldn’t load your client roster right now.
        </CardContent>
      </Card>
    );
  }

  const { data: pendingInvites } = await supabase
    .from("client_invitations")
    .select("id, email, full_name")
    .eq("trainer_id", trainerProfile.id)
    .eq("status", "pending")
    .order("created_at", { ascending: false })
    .overrideTypes<PendingInvite[], { merge: false }>();

  const clientIds = (clientLinks ?? []).map((link) => link.client_id);
  const clientsByStatus: Record<ClientStatus, RosterPerson[]> = {
    active: [],
    invited: [],
    archived: [],
  };

  if (clientIds.length > 0) {
    const { data: clientProfiles, error: clientProfilesError } = await supabase
      .from("profiles")
      .select("id, full_name, email, avatar_url")
      .in("id", clientIds)
      .overrideTypes<ClientProfileSummary[], { merge: false }>();

    if (clientProfilesError) {
      return (
        <Card>
          <CardContent className="py-10 text-center text-sm text-muted-foreground">
            We couldn’t load your client details right now.
          </CardContent>
        </Card>
      );
    }

    const profileMap = new Map(
      (clientProfiles ?? []).map((profile) => [profile.id, profile])
    );

    for (const link of clientLinks ?? []) {
      const profile = profileMap.get(link.client_id);
      if (!profile) continue;

      const status = link.status ?? "active";
      if (status === "active" || status === "invited" || status === "archived") {
        clientsByStatus[status].push({
          key: profile.id,
          full_name: profile.full_name,
          email: profile.email,
          href: `/trainer/clients/${profile.id}`,
        });
      }
    }
  }

  for (const invite of pendingInvites ?? []) {
    clientsByStatus.invited.push({
      key: `invite-${invite.id}`,
      full_name: invite.full_name,
      email: invite.email,
    });
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Clients</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Invite clients, then coach the people who accept.
          </p>
        </div>
      </div>

      <InviteClientForm />

      <div className="space-y-6">
        {orderedStatuses.map((status) => {
          const clients = clientsByStatus[status];
          const total = clients.length;

          return (
            <section key={status} className="space-y-3">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-medium uppercase tracking-[0.08em] text-muted-foreground">
                  {STATUS_LABELS[status]}
                </h2>
                <span className="rounded-full border border-border bg-muted px-2 py-1 text-xs text-muted-foreground">
                  {total}
                </span>
              </div>

              {total === 0 ? (
                <Card>
                  <CardContent className="py-8 text-center text-sm text-muted-foreground">
                    {status === "active" && "No active clients yet. Invite someone to get started."}
                    {status === "invited" && "No invited clients yet."}
                    {status === "archived" && "No archived clients yet."}
                  </CardContent>
                </Card>
              ) : (
                <div className="grid gap-3">
                  {clients.map((client) => {
                    const personInitials = initials(client.full_name ?? client.email ?? "Client");

                    const statusClass =
                      status === "active"
                        ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-700"
                        : status === "invited"
                          ? "border-amber-500/20 bg-amber-500/10 text-amber-700"
                          : "border-slate-500/20 bg-slate-500/10 text-slate-700";

                    const card = (
                      <Card className={client.href ? "transition-colors hover:bg-secondary/40" : ""}>
                        <CardContent className="flex items-center justify-between gap-4 py-4">
                          <div className="flex items-center gap-4">
                            <div className="flex h-11 w-11 items-center justify-center rounded-full bg-muted text-sm font-semibold text-muted-foreground">
                              {personInitials}
                            </div>

                            <div>
                              <p className="font-medium text-foreground">
                                {client.full_name || "Unnamed client"}
                              </p>
                              <p className="text-sm text-muted-foreground">
                                {client.email || "No email available"}
                              </p>
                              {status === "invited" && !client.href && (
                                <p className="mt-1 text-xs text-muted-foreground">
                                  Waiting for them to sign up or log in.
                                </p>
                              )}
                            </div>
                          </div>

                          <div
                            className={`rounded-full border px-2.5 py-1 text-xs font-medium ${statusClass}`}
                          >
                            {STATUS_LABELS[status]}
                          </div>
                        </CardContent>
                      </Card>
                    );

                    if (!client.href) {
                      return <div key={client.key}>{card}</div>;
                    }

                    return (
                      <Link
                        key={client.key}
                        href={client.href}
                        className="block rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                      >
                        {card}
                      </Link>
                    );
                  })}
                </div>
              )}
            </section>
          );
        })}
      </div>
    </div>
  );
}
