import assert from "node:assert/strict";
import test from "node:test";
import { friendlyAcceptFailure, friendlyInviteFailure, safeAppPath } from "../lib/invitations/errors.ts";

test("invite errors stay understandable and hide raw database text", () => {
  assert.equal(
    friendlyInviteFailure("That email belongs to a trainer account"),
    "That email belongs to a trainer account"
  );
  assert.equal(
    friendlyInviteFailure("duplicate key value violates unique constraint"),
    "We couldn’t create that invitation. Please try again."
  );
});

test("accept errors cover expiry, revoke, and email mismatch", () => {
  assert.match(friendlyAcceptFailure("This invitation has expired"), /expired/);
  assert.match(friendlyAcceptFailure("This invitation was revoked"), /revoked/);
  assert.match(friendlyAcceptFailure("This invitation does not match your account email"), /email/);
  assert.equal(
    friendlyAcceptFailure("permission denied for table trainer_clients"),
    "We couldn’t connect you to that trainer. Please try again."
  );
});

test("auth email redirects cannot leave the app or cross a guessed path", () => {
  assert.equal(safeAppPath("/client/dashboard"), "/client/dashboard");
  assert.equal(safeAppPath("/trainer/clients"), "/trainer/clients");
  assert.equal(safeAppPath("//evil.example"), null);
  assert.equal(safeAppPath("https://evil.example"), null);
  assert.equal(safeAppPath("/invite"), null);
});
