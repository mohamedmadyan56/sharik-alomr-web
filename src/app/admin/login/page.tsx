"use client";

import { useRouter } from "next/navigation";
import { useApp } from "@/app/providers";
import { AdminLoginPage } from "@/views/AdminLoginPage";

export default function Page() {
  const router = useRouter();
  const { language } = useApp();

  return (
    <AdminLoginPage
      key={language}
      language={language}
      back={() => router.push("/")}
      done={() => router.push("/dashboard/admin")}
    />
  );
}
