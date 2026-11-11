import { redirect } from "next/navigation";
import type { ReactNode } from "react";
import { getServerSession } from "@/lib/server-auth";

export default async function UserDashboardLayout({
  children,
}: {
  children: ReactNode;
}) {
  const session = await getServerSession();
  if (!session) redirect("/login?next=/dashboard/user");
  if (!session.profileCompletion.basicsComplete) redirect("/onboarding");

  return <>{children}</>;
}
