"use client";

import { FormEvent, useMemo, useEffect, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import type { User } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/client";

const CALLBACK_PATH = "/auth/callback";

type AuthButtonProps = {
  user: User | null;
};

type Status = "idle" | "loading" | "sent" | "error";

export default function AuthButton({ user }: AuthButtonProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<Status>("idle");
  const [error, setError] = useState<string | null>(null);

  const redirectPath = useMemo(() => {
    const params = new URLSearchParams(searchParams.toString());
    params.delete("auth");
    params.delete("message");
    const query = params.toString();
    return query ? `${pathname}?${query}` : pathname;
  }, [pathname, searchParams]);

  const getRedirectUrl = () => {
    const origin =
      typeof window !== "undefined"
        ? window.location.origin
        : process.env.NEXT_PUBLIC_SITE_URL;

    if (!origin) {
      console.warn(
        "Supabase magic link requires NEXT_PUBLIC_SITE_URL when running outside the browser."
      );
      const fallback = new URL(CALLBACK_PATH, "http://localhost:3000");
      if (redirectPath) {
        fallback.searchParams.set("redirect", redirectPath);
      }
      return fallback.toString();
    }

    const url = new URL(CALLBACK_PATH, origin);
    if (redirectPath) {
      url.searchParams.set("redirect", redirectPath);
    }
    return url.toString();
  };

  useEffect(() => {
    const authStatus = searchParams.get("auth");
    if (!authStatus) return;

    if (!user) {
      if (authStatus === "error") {
        setStatus("error");
        setError(
          searchParams.get("message") ?? "Magic link sign-in failed. Try again."
        );
      } else if (authStatus === "missing_code") {
        setStatus("error");
        setError("Magic link is missing a code. Request a new one.");
      } else if (authStatus === "success") {
        setStatus("sent");
        setError(null);
      }
    }

    const params = new URLSearchParams(searchParams.toString());
    params.delete("auth");
    params.delete("message");
    const query = params.toString();
    const cleanPath = query ? `${pathname}?${query}` : pathname;
    router.replace(cleanPath);
  }, [pathname, router, searchParams, user]);

  const handleSignOut = async () => {
    setStatus("loading");
    const supabase = createClient();
    const { error: signOutError } = await supabase.auth.signOut();
    if (signOutError) {
      setStatus("error");
      setError(signOutError.message);
      return;
    }
    setStatus("idle");
    setError(null);
    router.refresh();
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!email) return;

    setStatus("loading");
    setError(null);

    const supabase = createClient();
    const { error: signInError } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: getRedirectUrl(),
      },
    });

    if (signInError) {
      setStatus("error");
      setError(signInError.message);
      return;
    }

    setStatus("sent");
  };

  if (user) {
    return (
      <div className="flex items-center gap-3 text-sm text-gray-700">
        <span className="hidden sm:inline">{user.email}</span>
        <button
          type="button"
          onClick={handleSignOut}
          disabled={status === "loading"}
          className="rounded-lg border border-gray-200 px-3 py-1.5 text-gray-700 transition hover:bg-gray-50 disabled:opacity-50"
        >
          Sign out
        </button>
      </div>
    );
  }

  return (
    <form className="flex items-center gap-2" onSubmit={handleSubmit}>
      <input
        type="email"
        value={email}
        onChange={(event) => setEmail(event.target.value)}
        placeholder="you@example.com"
        className="w-44 rounded-lg border border-gray-200 px-3 py-1.5 text-sm shadow-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
      />
      <button
        type="submit"
        disabled={status === "loading"}
        className="rounded-lg bg-brand-600 px-3 py-1.5 text-sm font-medium text-white transition hover:bg-brand-700 disabled:opacity-60"
      >
        {status === "loading" ? "Sending..." : "Send magic link"}
      </button>
      {status === "sent" && (
        <span className="text-xs text-green-600">Check your email!</span>
      )}
      {status === "error" && error && (
        <span className="text-xs text-red-600">{error}</span>
      )}
    </form>
  );
}
