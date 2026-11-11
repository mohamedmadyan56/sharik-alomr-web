"use client"

import { useRouter } from "next/navigation"
import { useApp } from "@/app/providers"
import Login from "@/views/LoginPage"

export default function Page() {
  const router = useRouter()
  const { language, refreshUser } = useApp()
  return (
    <Login
      key={language}
      language={language}
      onAuthenticated={refreshUser}
      done={() => router.push("/dashboard/user")}
      back={() => router.push("/")}
    />
  )
}
