import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

const DEFAULT_REDIRECT = "/";

function isValidRedirect(path: string | null) {
  if (!path) return false;
  return path.startsWith("/") && !path.startsWith("//");
}

function getOrigin(url: URL, requestUrl: string): string {
  if (url.origin) return url.origin;
  if (url.protocol && url.host) return `${url.protocol}//${url.host}`;
  const requestUrlObj = new URL(requestUrl);
  if (requestUrlObj.origin) return requestUrlObj.origin;
  if (requestUrlObj.protocol && requestUrlObj.host) return `${requestUrlObj.protocol}//${requestUrlObj.host}`;
  // Fallback: extract from request URL string
  const parts = requestUrl.split('/');
  return parts.slice(0, 3).join('/') || "/";
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const next = url.searchParams.get("redirect");

  const redirectPath: string = isValidRedirect(next) ? (next as string) : DEFAULT_REDIRECT;
  // Extract origin safely - for HTTP/HTTPS URLs this should always exist
  const baseUrl: string = getOrigin(url, request.url);
  const redirectUrl = new URL(redirectPath, baseUrl);

  if (!code) {
    redirectUrl.searchParams.set("auth", "missing_code");
    return NextResponse.redirect(redirectUrl);
  }

  const supabase = createClient();
  const { data, error } = await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    console.error("[auth:callback] failed to exchange code", error);
    redirectUrl.searchParams.set("auth", "error");
    redirectUrl.searchParams.set("message", error.message);
    return NextResponse.redirect(redirectUrl);
  }

  // Verify session was created
  if (!data.session) {
    console.error("[auth:callback] no session returned after code exchange");
    redirectUrl.searchParams.set("auth", "error");
    redirectUrl.searchParams.set("message", "Failed to create session");
    return NextResponse.redirect(redirectUrl);
  }

  // Verify user was set
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    console.error("[auth:callback] no user found after session creation");
    redirectUrl.searchParams.set("auth", "error");
    redirectUrl.searchParams.set("message", "Failed to authenticate user");
    return NextResponse.redirect(redirectUrl);
  }

  // Redirect with success - cookies should be set by exchangeCodeForSession
  redirectUrl.searchParams.set("auth", "success");
  // Use redirect with a 303 status to force a fresh request
  return NextResponse.redirect(redirectUrl, { status: 303 });
}
