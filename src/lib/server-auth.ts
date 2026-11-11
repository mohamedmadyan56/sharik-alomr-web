/**
 * قراءة الجلسات من الخادم للتحقق قبل عرض صفحات الداشبورد.
 * نمرّر كوكي الطلب إلى BFF مباشرة، فلا نعتمد على وجود الكوكي فقط.
 */
import { cookies } from "next/headers";

const BFF_URL = process.env.BFF_URL ?? "http://127.0.0.1:4001";

export type ServerSession = {
  user: {
    id: string;
    firstName: string;
    lastName: string | null;
    phone: string;
    email: string | null;
    accountStatus: string;
    profileQuality: number;
  };
  session: {
    id: string;
    createdAt: string;
    lastSeenAt: string;
    expiresAt: string;
  };
  profileCompletion: {
    percent: number;
    basicsComplete: boolean;
    missing: string[];
  };
};

export type ServerAdmin = {
  id: string;
  name: string;
  email: string;
  status: string;
  roles: Array<{ id: string; key: string; nameAr: string; scope: string | null }>;
  permissions: string[];
  isSuperAdmin: boolean;
};

async function bffGet<T>(path: string): Promise<T | null> {
  const cookieStore = await cookies();
  const cookieHeader = cookieStore.toString();
  if (!cookieHeader) return null;

  let response: Response;
  try {
    response = await fetch(`${BFF_URL}${path}`, {
      headers: { cookie: cookieHeader, accept: "application/json" },
      cache: "no-store",
    });
  } catch {
    console.error("[web] تعذّر الوصول إلى BFF أثناء التحقق من الجلسة");
    return null;
  }

  if (response.status === 401 || response.status === 403) return null;
  if (!response.ok) {
    console.error("[web] فشل التحقق من الجلسة", response.status);
    return null;
  }

  const payload = (await response.json().catch(() => null)) as { data?: T } | null;
  return payload?.data ?? null;
}

export async function getServerSession(): Promise<ServerSession | null> {
  return bffGet<ServerSession>("/api/auth/me");
}

export async function getServerAdmin(): Promise<ServerAdmin | null> {
  const result = await bffGet<{ admin: ServerAdmin }>("/api/admin/auth/me");
  return result?.admin ?? null;
}
