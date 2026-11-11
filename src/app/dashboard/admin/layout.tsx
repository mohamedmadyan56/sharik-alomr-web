import { redirect } from "next/navigation";
import type { ReactNode } from "react";
import { getServerAdmin } from "@/lib/server-auth";

export default async function AdminDashboardLayout({
  children,
}: {
  children: ReactNode;
}) {
  const admin = await getServerAdmin();
  if (!admin) redirect("/admin/login?next=/dashboard/admin");
  if (admin.status !== "active") redirect("/admin/login?error=suspended");

  return <>{children}</>;
}
