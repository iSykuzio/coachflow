import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Card, CardContent } from "@/components/ui/card";
import { formatDate } from "@/lib/utils";
import { AssignWorkoutForm } from "@/components/workouts/assign-workout-form";

type ProfileSummary = {
  id: string;
  role: string;
  full_name: string;
};

type ClientLink = {
  client_id: string;
  status: string;
};

type ClientProfileSummary = {
  id: string;
  full_name: string | null;
  email: string | null;
  avatar_url: string | null;
};

type WorkoutRow = {
  id: string;
  name: string;
};

type AssignmentRow = {
  id: string;
  status: string;
  assigned_date: string;
  due_date: string | null;
  workout_id: string;
};

type ClientStatus = "active" | "invited" | "archived";

const STATUS_LABELS: Record<ClientStatus, string> = {
  active: "Active",
  invited: "Invited",
  archived: "Archived",
};

function isClientStatus(value: string): value is ClientStatus {
  return value === "active" || value === "invited" || value === "archived";
}

function ErrorState({ message }: { message: string }) {
  return (
    <div className="space-y-6">
      <BackLink />
      <Card>
        <CardContent className="py-10 text-center text-sm text-muted-foreground">
          {message}
        </CardContent>
      </Card>
    </div>
  );
}

function BackLink() {
  return (
    <Link
      href="/trainer/clients"
      className="inline-flex text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
    >
      ← Back to clients
    </Link>
  );
}

export default async function TrainerClientProfilePage({
  params,
}: {
  params: { clientId: string };
}) {
  const supabase = createClient();
  const clientId = params.clientId;

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
    return <ErrorState message="We couldn’t load your trainer profile right now." />;
  }

  if (trainerProfile.role !== "trainer") {
    redirect("/client/dashboard");
  }

  const { data: clientLink, error: clientLinkError } = await supabase
    .from("trainer_clients")
    .select("client_id, status")
    .eq("trainer_id", trainerProfile.id)
    .eq("client_id", clientId)
    .maybeSingle()
    .overrideTypes<ClientLink | null, { merge: false }>();

  if (clientLinkError) {
    return <ErrorState message="We couldn’t load this client right now." />;
  }

  if (!clientLink) {
    return (
      <ErrorState message="This client is not on your roster, or the record could not be found." />
    );
  }

  const { data: clientProfile, error: clientProfileError } = await supabase
    .from("profiles")
    .select("id, full_name, email, avatar_url")
    .eq("id", clientLink.client_id)
    .maybeSingle()
    .overrideTypes<ClientProfileSummary | null, { merge: false }>();

  if (clientProfileError) {
    return <ErrorState message="We couldn’t load this client’s details right now." />;
  }

  if (!clientProfile) {
    return (
      <ErrorState message="This client is not on your roster, or the record could not be found." />
    );
  }

  const status = isClientStatus(clientLink.status) ? clientLink.status : null;

  const { data: workouts } = await supabase
    .from("workouts")
    .select("id, name")
    .eq("trainer_id", trainerProfile.id)
    .order("name")
    .overrideTypes<WorkoutRow[], { merge: false }>();

  const { data: assignments } = await supabase
    .from("assigned_workouts")
    .select("id, status, assigned_date, due_date, workout_id")
    .eq("trainer_id", trainerProfile.id)
    .eq("client_id", clientProfile.id)
    .order("assigned_date", { ascending: false })
    .overrideTypes<AssignmentRow[], { merge: false }>();

  const workoutName = new Map((workouts ?? []).map((workout) => [workout.id, workout.name]));
  const initials =
    (clientProfile.full_name ?? clientProfile.email ?? "Client")
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase() ?? "")
      .join("") || "C";

  const statusClass =
    status === "active"
      ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-700"
      : status === "invited"
        ? "border-amber-500/20 bg-amber-500/10 text-amber-700"
        : "border-slate-500/20 bg-slate-500/10 text-slate-700";

  return (
    <div className="space-y-6">
      <BackLink />

      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            {clientProfile.full_name || "Unnamed client"}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">Client profile</p>
        </div>
        <div className={`rounded-full border px-2.5 py-1 text-xs font-medium ${statusClass}`}>
          {status ? STATUS_LABELS[status] : "Unknown"}
        </div>
      </div>

      <Card>
        <CardContent className="flex items-center gap-4 py-6">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-muted text-sm font-semibold text-muted-foreground">
            {clientProfile.avatar_url ? (
              <span className="sr-only">{clientProfile.full_name ?? "Client"}</span>
            ) : (
              initials
            )}
          </div>
          <div>
            <p className="font-medium text-foreground">
              {clientProfile.full_name || "Unnamed client"}
            </p>
            <p className="text-sm text-muted-foreground">
              {clientProfile.email || "No email available"}
            </p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="space-y-4 py-6">
          <div>
            <p className="text-xs font-medium uppercase tracking-[0.08em] text-muted-foreground">
              Name
            </p>
            <p className="mt-1 text-sm text-foreground">
              {clientProfile.full_name || "Unnamed client"}
            </p>
          </div>
          <div>
            <p className="text-xs font-medium uppercase tracking-[0.08em] text-muted-foreground">
              Email
            </p>
            <p className="mt-1 text-sm text-foreground">
              {clientProfile.email || "No email available"}
            </p>
          </div>
          <div>
            <p className="text-xs font-medium uppercase tracking-[0.08em] text-muted-foreground">
              Relationship status
            </p>
            <p className="mt-1 text-sm text-foreground">
              {status ? STATUS_LABELS[status] : "Unknown"}
            </p>
          </div>
        </CardContent>
      </Card>

      <section className="space-y-3">
        <h2 className="text-sm font-medium uppercase tracking-[0.08em] text-muted-foreground">
          Assigned workouts
        </h2>
        {status === "active" && (
          <AssignWorkoutForm
            defaultClientId={clientProfile.id}
            clients={[{ id: clientProfile.id, name: clientProfile.full_name || "Client" }]}
            workouts={(workouts ?? []).map((workout) => ({ id: workout.id, name: workout.name }))}
          />
        )}
        {(assignments ?? []).length === 0 ? (
          <Card>
            <CardContent className="py-8 text-center text-sm text-muted-foreground">
              {status === "active"
                ? "No workouts assigned yet."
                : "Workouts can be assigned after this client is active."}
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-3">
            {(assignments ?? []).map((assignment) => (
              <Card key={assignment.id}>
                <CardContent className="flex items-center justify-between gap-4 py-4">
                  <div>
                    <p className="font-medium text-foreground">
                      {workoutName.get(assignment.workout_id) ?? "Workout"}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Assigned {formatDate(assignment.assigned_date)}
                      {assignment.due_date ? ` · due ${formatDate(assignment.due_date)}` : ""}
                    </p>
                  </div>
                  <span className="text-xs font-medium capitalize text-muted-foreground">
                    {assignment.status.replace("_", " ")}
                  </span>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
