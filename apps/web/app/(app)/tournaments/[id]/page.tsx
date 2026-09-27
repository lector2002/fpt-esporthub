import { OfflineTournamentDetail } from "@/features/offline-tournaments/components/tournament-detail";

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <OfflineTournamentDetail id={id} />;
}
