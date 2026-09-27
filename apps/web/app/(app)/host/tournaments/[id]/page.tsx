import { HostTournamentPage } from "@/features/offline-tournaments/components/host-tournament";

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <HostTournamentPage id={id} />;
}
