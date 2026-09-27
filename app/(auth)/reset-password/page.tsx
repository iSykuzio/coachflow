"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { homeForRole } from "@/lib/auth/home-path";
import { friendlyPasswordUpdateError, resetPasswordSchema } from "@/lib/auth/password";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";

const PASSWORD_USER_KEY = "cf_pw_uid";
const DIFFERENT_ACCOUNT =
  "This browser is signed in as a different account. Open the invitation link in a private window. No password was changed.";

export default function ResetPasswordPage() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [checking, setChecking] = useState(true);
  const [hasSession, setHasSession] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const expectedId = sessionStorage.getItem(PASSWORD_USER_KEY);
    const supabase = createClient();
    let settled = false;

    function finish(sessionPresent: boolean) {
      if (settled && !sessionPresent) return;
      if (sessionPresent) {
        settled = true;
        setError(null);
      }
      setHasSession(sessionPresent);
      setChecking(false);
    }

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (expectedId) {
        if (session?.user?.id === expectedId) finish(true);
        else if (session?.user && session.user.id !== expectedId && !settled) {
          setHasSession(false);
          setChecking(false);
          setError(DIFFERENT_ACCOUNT);
        } else if (event === "INITIAL_SESSION" && !session) {
          window.setTimeout(() => {
            if (!settled) finish(false);
          }, 800);
        }
        return;
      }

      if (event === "PASSWORD_RECOVERY" || session) finish(true);
      if (event === "INITIAL_SESSION" && !session) {
        window.setTimeout(() => {
          if (!settled) finish(false);
        }, 400);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    const parsed = resetPasswordSchema.safeParse({ password, confirmPassword });
    if (!parsed.success) {
      setError(parsed.error.errors[0].message);
      return;
    }

    setLoading(true);
    const supabase = createClient();
    const expectedId = sessionStorage.getItem(PASSWORD_USER_KEY);
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user || (expectedId && user.id !== expectedId)) {
      setLoading(false);
      setHasSession(false);
      setError(expectedId ? DIFFERENT_ACCOUNT : "This reset link is invalid or has expired. Request a new one.");
      return;
    }

    const { error: updateError } = await supabase.auth.updateUser({
      password: parsed.data.password,
    });
    if (updateError) {
      setLoading(false);
      setError(friendlyPasswordUpdateError(updateError.message));
      return;
    }

    sessionStorage.removeItem(PASSWORD_USER_KEY);
    const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).maybeSingle();

    setLoading(false);
    router.push(homeForRole(profile?.role));
    router.refresh();
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Choose a new password</CardTitle>
        <CardDescription>Use at least 8 characters. You’ll then continue into CoachFlow.</CardDescription>
      </CardHeader>
      {checking ? (
        <CardContent>
          <p className="text-sm text-muted-foreground">Checking your reset link…</p>
        </CardContent>
      ) : !hasSession ? (
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            {error ?? "This reset link is invalid or has expired. Request a new one."}
          </p>
          <Link href="/forgot-password" className="text-sm text-accent hover:underline">
            Forgot password
          </Link>
        </CardContent>
      ) : (
        <form onSubmit={handleSubmit}>
          <CardContent className="space-y-4">
            {error && (
              <div role="alert" className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
                {error}
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="password">New password</Label>
              <Input
                id="password"
                type="password"
                autoComplete="new-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirm password</Label>
              <Input
                id="confirmPassword"
                type="password"
                autoComplete="new-password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
              />
            </div>
          </CardContent>
          <CardFooter>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "Saving..." : "Update password"}
            </Button>
          </CardFooter>
        </form>
      )}
    </Card>
  );
}
