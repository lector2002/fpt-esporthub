import { CommunityRoomView } from "@/features/communities/components/community-room";

export default async function Page({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ channel?: string }>;
}) {
  const [{ id }, { channel }] = await Promise.all([params, searchParams]);
  return <CommunityRoomView id={id} channel={channel} />;
}
