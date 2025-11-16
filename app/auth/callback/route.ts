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
  const { error } = await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    redirectUrl.searchParams.set("auth", "error");
    redirectUrl.searchParams.set("message", error.message);
    return NextResponse.redirect(redirectUrl);
  }

  redirectUrl.searchParams.set("auth", "success");
  return NextResponse.redirect(redirectUrl);
}
