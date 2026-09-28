import { notFound } from "next/navigation";
import { AdminPage } from "@/features/admin/components/admin-page";
import { hasAdminDetail, isAdminSection } from "@/features/admin/nav";

export default async function Page({ params }: { params: Promise<{ section: string; id: string }> }) {
  const { section, id } = await params;
  if (!isAdminSection(section) || !hasAdminDetail(section)) notFound();
  return <AdminPage section={section} detailId={id} />;
}
