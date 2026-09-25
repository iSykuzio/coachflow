"use server";

import { headers } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { inviteClientSchema } from "@/lib/validations/clients";
import { friendlyInviteFailure } from "@/lib/invitations/errors";

export type SendInvitationResult = {
  ok: boolean;
  emailed: boolean;
  message: string;
};

function alreadyRegistered(message: string): boolean {
  const normalized = message.toLowerCase();
  return (
    normalized.includes("already been registered") ||
    normalized.includes("already registered") ||
    normalized.includes("user already exists")
  );
}

function appOrigin(): string | null {
  const configured = process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "");
  if (configured) return configured;
  const origin = headers().get("origin");
  if (origin && /^https?:\/\//.test(origin)) return origin;
  return null;
}

export async function sendClientInvitation(input: {
  fullName: string;
  email: string;
}): Promise<SendInvitationResult> {
  const parsed = inviteClientSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, emailed: false, message: parsed.error.errors[0].message };
  }

  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { ok: false, emailed: false, message: "Not authenticated" };
  }

  const { error: inviteError } = await supabase.rpc("invite_client", {
    p_full_name: parsed.data.fullName,
    p_email: parsed.data.email,
  });
  if (inviteError) {
    return { ok: false, emailed: false, message: friendlyInviteFailure(inviteError.message) };
  }

  const origin = appOrigin();
  const admin = createAdminClient();
  if (!admin || !origin) {
    return {
      ok: true,
      emailed: false,
      message: `Invitation created for ${parsed.data.email}. Email is not configured on the server yet, so ask them to sign up with this address as a client.`,
    };
  }

  const redirectTo = `${origin}/auth/callback?next=/client/dashboard`;
  const invited = await admin.auth.admin.inviteUserByEmail(parsed.data.email, {
    data: { role: "client", full_name: parsed.data.fullName },
    redirectTo,
  });

  if (!invited.error) {
    return {
      ok: true,
      emailed: true,
      message: `Invitation email sent to ${parsed.data.email}. They’ll stay Invited until they open it and set a password.`,
    };
  }

  if (!alreadyRegistered(invited.error.message)) {
    return {
      ok: true,
      emailed: false,
      message: `Invitation created for ${parsed.data.email}, but the email could not be sent. Ask them to sign up with this address as a client.`,
    };
  }

  const magic = await admin.auth.signInWithOtp({
    email: parsed.data.email,
    options: { shouldCreateUser: false, emailRedirectTo: redirectTo },
  });

  if (magic.error) {
    return {
      ok: true,
      emailed: false,
      message: `Invitation created for ${parsed.data.email}. They already have an account, but the login email could not be sent. Ask them to log in with this address.`,
    };
  }

  return {
    ok: true,
    emailed: true,
    message: `Invitation email sent to ${parsed.data.email}. They already have an account, so the email signs them in and connects them to you.`,
  };
}
