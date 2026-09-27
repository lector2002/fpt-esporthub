import { CoachDetail } from "@/features/coaching/components/coach-detail";

export default async function CoachDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <CoachDetail id={id} />;
}
