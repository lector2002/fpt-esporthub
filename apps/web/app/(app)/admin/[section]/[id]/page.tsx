import { notFound } from "next/navigation";
import { AdminPage } from "@/features/admin/components/admin-page";

export default async function Page({ params }: { params: Promise<{ section: string; id: string }> }) {
  const { section, id } = await params;
  if (section !== "users") notFound();
  return <AdminPage section="users" userId={id} />;
}
