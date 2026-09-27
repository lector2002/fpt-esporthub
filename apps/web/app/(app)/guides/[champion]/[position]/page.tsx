import { GuideDetailPage } from "@/features/guides/components/guide-detail";

export default async function Page({ params }: { params: Promise<{ champion: string; position: string }> }) {
  const { champion, position } = await params;
  return <GuideDetailPage champion={decodeURIComponent(champion)} position={position} />;
}
