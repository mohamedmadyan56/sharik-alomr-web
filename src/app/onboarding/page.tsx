"use client"

import { useRouter } from "next/navigation"
import { useApp } from "@/app/providers"
import { Onboarding } from "@/views/LoginPage"

export default function Page() {
  const router = useRouter()
  const { language } = useApp()
  return (
    <Onboarding
      key={language}
      language={language}
      done={() => router.push("/dashboard/user")}
      back={() => router.push("/")}
    />
  )
}
