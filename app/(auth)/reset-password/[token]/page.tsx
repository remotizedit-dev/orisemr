import { redirect } from "next/navigation";

interface PageProps {
  params: Promise<{ token: string }>;
}

/**
 * Handles legacy or path-based password reset URLs:
 * /reset-password/[token] -> redirects to /reset-password?token=[token]
 */
export default async function ResetPasswordTokenRedirect({ params }: PageProps) {
  const { token } = await params;
  if (!token) {
    redirect("/forgot-password");
  }
  redirect(`/reset-password?token=${encodeURIComponent(token)}`);
}
