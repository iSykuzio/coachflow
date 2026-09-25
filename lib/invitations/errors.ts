const INVITE_ERRORS = [
  "Enter the client's full name",
  "Enter a valid email address",
  "That email belongs to a trainer account",
  "This person is already on your roster",
  "This client is already connected to another trainer",
  "You already have a pending invitation for this email",
  "Only trainers can invite clients",
  "Not authenticated",
];

const ACCEPT_ERRORS = [
  "This invitation has expired",
  "This invitation was revoked",
  "This invitation has already been accepted",
  "This invitation is no longer pending",
  "This invitation does not match your account email",
  "You are already connected to a trainer",
  "Only client accounts can accept invitations",
  "Invitation not found",
  "Not authenticated",
];

export function friendlyInviteFailure(message: string): string {
  return (
    INVITE_ERRORS.find((item) => message.includes(item)) ??
    "We couldn’t create that invitation. Please try again."
  );
}

export function friendlyAcceptFailure(message: string): string {
  return (
    ACCEPT_ERRORS.find((item) => message.includes(item)) ??
    "We couldn’t connect you to that trainer. Please try again."
  );
}

export function safeAppPath(next: string | null | undefined): string | null {
  if (!next || !next.startsWith("/") || next.startsWith("//") || next.includes("\\") || next.includes("://")) {
    return null;
  }
  if (next.startsWith("/client") || next.startsWith("/trainer")) return next;
  return null;
}
