"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";

export default function SignupPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [checkEmail, setCheckEmail] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }

    setLoading(true);
    const supabase = createClient();
    const { error: signUpError } = await supabase.auth.signUp({ email, password });
    setLoading(false);

    if (signUpError) {
      setError(signUpError.message);
      return;
    }

    setCheckEmail(true);
  }

  if (checkEmail) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <div className="panel p-6 max-w-sm text-center space-y-2">
          <div className="text-2xl">📩</div>
          <h1 className="font-medium">Check your inbox</h1>
          <p className="text-sm text-[var(--text-muted)]">
            We sent a confirmation link to {email}. Follow it to activate your account.
          </p>
          <Link href="/login" className="inline-block text-sm text-[var(--amber)] hover:underline pt-2">
            Back to sign in
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen grid lg:grid-cols-2">
      {/* Explainer panel */}
      <div className="hidden lg:flex flex-col justify-center px-16 py-12 border-r border-[var(--border)] bg-[var(--panel-raised)]">
        <div className="font-mono-board text-2xl tracking-widest text-[var(--amber)] mb-6">
          NUMLYSMS
        </div>
        <h1 className="text-3xl font-semibold leading-tight mb-4">
          Business SMS, without the busywork.
        </h1>
        <p className="text-[var(--text-muted)] mb-8 max-w-md">
          Send appointment reminders, order updates, and marketing texts to your
          customers from one dashboard &mdash; no carrier setup, no separate SIM,
          no juggling apps.
        </p>

        <ul className="space-y-4">
          <li className="flex gap-3">
            <span className="text-[var(--amber)] mt-0.5">✓</span>
            <div>
              <p className="font-medium">One number, every conversation</p>
              <p className="text-sm text-[var(--text-muted)]">
                A dedicated business line your team can text from together.
              </p>
            </div>
          </li>
          <li className="flex gap-3">
            <span className="text-[var(--amber)] mt-0.5">✓</span>
            <div>
              <p className="font-medium">Automated replies &amp; reminders</p>
              <p className="text-sm text-[var(--text-muted)]">
                Set up flows that text customers automatically, on schedule.
              </p>
            </div>
          </li>
          <li className="flex gap-3">
            <span className="text-[var(--amber)] mt-0.5">✓</span>
            <div>
              <p className="font-medium">Delivery you can see</p>
              <p className="text-sm text-[var(--text-muted)]">
                Track sent, delivered, and replied status on every message.
              </p>
            </div>
          </li>
        </ul>
      </div>

      {/* Form column */}
      <div className="flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-sm">
          <div className="mb-8 text-center lg:hidden">
            <div className="font-mono-board text-2xl tracking-widest text-[var(--amber)]">NUMLYSMS</div>
            <p className="text-sm text-[var(--text-muted)] mt-1">SMS for businesses &mdash; no setup hassle</p>
          </div>

          <h2 className="hidden lg:block text-xl font-semibold mb-6">Create your account</h2>

          <form onSubmit={handleSubmit} className="panel p-6 space-y-4">
            {error && (
              <div role="alert" className="text-sm text-[var(--coral)] bg-[var(--coral)]/10 border border-[var(--coral)]/30 rounded-lg px-3 py-2">
                {error}
              </div>
            )}

            <div>
              <label htmlFor="email" className="block text-sm text-[var(--text-muted)] mb-1.5">Work email</label>
              <input
                id="email"
                type="email"
                required
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded-lg bg-[var(--panel-raised)] border border-[var(--border)] px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--amber)]/50 focus:border-[var(--amber)]"
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-sm text-[var(--text-muted)] mb-1.5">Password</label>
              <input
                id="password"
                type="password"
                required
                autoComplete="new-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full rounded-lg bg-[var(--panel-raised)] border border-[var(--border)] px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--amber)]/50 focus:border-[var(--amber)]"
              />
              <p className="text-xs text-[var(--text-muted)] mt-1">At least 8 characters.</p>
            </div>

            <Button type="submit" loading={loading} className="w-full">
              Create account
            </Button>

            <p className="text-xs text-[var(--text-muted)] text-center pt-1">
              By signing up, you agree to receive account-related emails. No spam.
            </p>
          </form>

          <p className="text-center text-sm text-[var(--text-muted)] mt-4">
            Already have an account?{" "}
            <Link href="/login" className="text-[var(--amber)] hover:underline">
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
