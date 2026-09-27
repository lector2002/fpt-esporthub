import { TeamDetailView } from "@/features/teams/components/team-detail";

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <TeamDetailView id={id} />;
}
