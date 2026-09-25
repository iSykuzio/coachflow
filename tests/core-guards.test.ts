import assert from "node:assert/strict";
import test from "node:test";
import { homeForRole, safeNextPath } from "../lib/auth/home-path.ts";
import { parseOptionalNumber } from "../lib/workouts/set-input.ts";

test("home routes stay inside the signed-in role", () => {
  assert.equal(homeForRole("trainer"), "/trainer/dashboard");
  assert.equal(homeForRole("client"), "/client/dashboard");
  assert.equal(homeForRole(null), "/");
});

test("next redirects cannot cross roles or leave the site", () => {
  assert.equal(safeNextPath("/trainer/clients", "trainer"), "/trainer/clients");
  assert.equal(safeNextPath("/client/workouts", "client"), "/client/workouts");
  assert.equal(safeNextPath("/trainer/clients", "client"), null);
  assert.equal(safeNextPath("/client/workouts", "trainer"), null);
  assert.equal(safeNextPath("//evil.example", "trainer"), null);
  assert.equal(safeNextPath("https://evil.example", "trainer"), null);
  assert.equal(safeNextPath("/login", "trainer"), null);
});

test("set inputs reject junk and allow blanks", () => {
  assert.deepEqual(parseOptionalNumber("", "reps"), { ok: true, value: null });
  assert.deepEqual(parseOptionalNumber("8", "reps"), { ok: true, value: 8 });
  assert.equal(parseOptionalNumber("8-12", "reps").ok, false);
  assert.equal(parseOptionalNumber("8.5", "reps").ok, false);
  assert.deepEqual(parseOptionalNumber("90.5", "weight"), { ok: true, value: 90.5 });
  assert.equal(parseOptionalNumber("heavy", "weight").ok, false);
});
