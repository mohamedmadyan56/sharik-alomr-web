"use client"

import { useRouter } from "next/navigation"
import { useApp } from "@/app/providers"
import UserDashboard from "@/views/UserDashboardPage"

export default function Page() {
  const router = useRouter()
  const { language, user, logout } = useApp()
  return (
    <UserDashboard
      key={language}
      language={language}
      user={user}
      logout={logout}
      exit={() => router.push("/")}
    />
  )
}
