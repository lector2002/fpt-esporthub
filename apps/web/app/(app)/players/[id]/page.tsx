import { PublicProfileScreen } from "@/features/profile/components/public-profile-screen";

export default async function PlayerPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <PublicProfileScreen userId={id} />;
}
