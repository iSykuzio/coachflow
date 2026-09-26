import assert from "node:assert/strict";
import test from "node:test";
import { friendlyPasswordUpdateError, resetPasswordSchema } from "../lib/auth/password.ts";

test("reset password requires a matching confirmation", () => {
  assert.equal(resetPasswordSchema.safeParse({ password: "short", confirmPassword: "short" }).success, false);
  assert.equal(
    resetPasswordSchema.safeParse({ password: "longenough", confirmPassword: "otherpass" }).success,
    false
  );
  assert.equal(
    resetPasswordSchema.safeParse({ password: "longenough", confirmPassword: "longenough" }).success,
    true
  );
});

test("password update errors stay friendly", () => {
  assert.match(friendlyPasswordUpdateError("New password should be different from the old password."), /not used/);
  assert.match(friendlyPasswordUpdateError("JWT expired"), /expired/);
  assert.equal(
    friendlyPasswordUpdateError("duplicate key value violates unique constraint"),
    "We couldn’t update that password. Request a new reset link and try again."
  );
});
