import { EditTeamView } from "@/features/teams/components/team-form-pages";

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <EditTeamView id={id} />;
}
