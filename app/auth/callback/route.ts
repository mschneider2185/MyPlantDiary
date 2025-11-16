import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

const DEFAULT_REDIRECT = "/";

function isValidRedirect(path: string | null) {
  if (!path) return false;
  return path.startsWith("/") && !path.startsWith("//");
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const next = url.searchParams.get("redirect");

  const redirectPath = isValidRedirect(next) ? next : DEFAULT_REDIRECT;
  // url.origin should always exist for HTTP/HTTPS URLs, but TypeScript allows null
  // Construct origin from protocol and host if origin is null (shouldn't happen in practice)
  const baseUrl = url.origin || `${url.protocol}//${url.host}`;
  const redirectUrl = new URL(redirectPath, baseUrl);

  if (!code) {
    redirectUrl.searchParams.set("auth", "missing_code");
    return NextResponse.redirect(redirectUrl);
  }

  const supabase = createClient();
  const { error } = await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    redirectUrl.searchParams.set("auth", "error");
    redirectUrl.searchParams.set("message", error.message);
    return NextResponse.redirect(redirectUrl);
  }

  redirectUrl.searchParams.set("auth", "success");
  return NextResponse.redirect(redirectUrl);
}
