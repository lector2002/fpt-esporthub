import { EventDetailView } from "@/features/events/components/event-detail";

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <EventDetailView id={id} />;
}
