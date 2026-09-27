import { TeamRoomView } from "@/features/team-room/components/team-room";

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <TeamRoomView id={id} />;
}
