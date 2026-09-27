import { redirect } from "next/navigation";

export default async function ConversationDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  redirect(`/inbox?c=${encodeURIComponent(id)}`);
}
