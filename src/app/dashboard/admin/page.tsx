"use client";

import { useRouter } from "next/navigation";
import { useApp } from "@/app/providers";
import AdminDashboard from "@/views/AdminDashboardPage";

export default function Page() {
  const router = useRouter();
  const { language, plans, setPlans } = useApp();
  return (
    <AdminDashboard
      back={() => router.push("/")}
      language={language}
      plans={plans}
      setPlans={setPlans}
    />
  );
}
