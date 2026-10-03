import { createAuthClient } from "better-auth/react";

function getClientBaseUrl() {
  if (typeof window !== "undefined") return window.location.origin;
  const envUrl = process.env.NEXT_PUBLIC_APP_URL;
  if (!envUrl) return "http://localhost:3000";
  return envUrl.startsWith("http") ? envUrl : `https://${envUrl}`;
}

export const authClient = createAuthClient({
  baseURL: getClientBaseUrl(),
});

export const { signIn, signUp, signOut, useSession } = authClient;
