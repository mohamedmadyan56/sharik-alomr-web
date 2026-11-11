"use client"

import { useRouter } from "next/navigation"
import { useApp } from "@/app/providers"
import { Pricing } from "@/views/HomePage"

export default function Page() {
  const router = useRouter()
  const { language, plans } = useApp()
  return (
    <Pricing
      key={language}
      language={language}
      back={() => router.push("/")}
      start={() => router.push("/onboarding")}
      plans={plans}
    />
  )
}
