import { TvBracket } from "@/features/offline-tournaments/components/tv-bracket";

/** Venue TV: public, outside the app shell. */
export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <TvBracket id={id} />;
}
