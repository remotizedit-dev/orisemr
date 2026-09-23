import { auth } from "@/lib/auth";
import { toNextJsHandler } from "better-auth/next-js";
import { NextRequest, NextResponse } from "next/server";

const { GET: betterAuthGet, POST: betterAuthPost } = toNextJsHandler(auth.handler);

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  // Friendly fallback: if user navigates to or refreshes /api/auth/sign-out in address bar
  if (url.pathname.endsWith("/sign-out")) {
    return NextResponse.redirect(new URL("/login", req.url));
  }
  return betterAuthGet(req);
}

export async function POST(req: NextRequest) {
  const url = new URL(req.url);

  // If a browser native form posts to /sign-out (application/x-www-form-urlencoded)
  if (url.pathname.endsWith("/sign-out")) {
    const contentType = req.headers.get("content-type") || "";
    if (contentType.includes("application/x-www-form-urlencoded") || !contentType.includes("application/json")) {
      const headers = new Headers(req.headers);
      headers.set("content-type", "application/json");

      const jsonReq = new NextRequest(req.url, {
        method: "POST",
        headers,
        body: JSON.stringify({}),
      });

      const res = await betterAuthPost(jsonReq);

      const loginUrl = new URL("/login", req.url);
      const redirectRes = NextResponse.redirect(loginUrl, { status: 303 });

      const setCookies = res.headers.getSetCookie?.() ?? [];
      for (const cookie of setCookies) {
        redirectRes.headers.append("Set-Cookie", cookie);
      }
      return redirectRes;
    }
  }

  return betterAuthPost(req);
}
