import { notFound } from "next/navigation";
import { AdminPage } from "@/features/admin/components/admin-page";
import { isAdminSection } from "@/features/admin/nav";

export default async function Page({ params }: { params: Promise<{ section: string }> }) {
  const { section } = await params;
  if (!isAdminSection(section)) notFound();
  return <AdminPage section={section} />;
}
