import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(req: NextRequest) {
  try {
    const { email, redirectPath } = await req.json();

    if (!email || typeof email !== "string") {
      return NextResponse.json({ error: "Email is required" }, { status: 400 });
    }

    // Get the production URL from environment variable, or construct from request
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 
      (req.headers.get("x-forwarded-proto") && req.headers.get("host")
        ? `${req.headers.get("x-forwarded-proto")}://${req.headers.get("host")}`
        : null) ||
      (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : null);

    if (!siteUrl) {
      return NextResponse.json(
        { error: "NEXT_PUBLIC_SITE_URL environment variable is not set" },
        { status: 500 }
      );
    }

    // Construct the callback URL with the redirect path
    const callbackUrl = new URL("/auth/callback", siteUrl);
    if (redirectPath && typeof redirectPath === "string" && redirectPath.startsWith("/")) {
      callbackUrl.searchParams.set("redirect", redirectPath);
    }

    const supabase = createClient();
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: callbackUrl.toString(),
      },
    });

    if (error) {
      console.error("[auth:send-magic-link] failed", error);
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error("[auth:send-magic-link] unexpected error", err);
    return NextResponse.json({ error: "Failed to send magic link" }, { status: 500 });
  }
}

