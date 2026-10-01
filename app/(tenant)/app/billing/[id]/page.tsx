import { redirect } from "next/navigation";

export default async function InvoiceRedirectPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  redirect(`/print/invoice/${id}`);
}
