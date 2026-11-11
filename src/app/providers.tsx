"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type Dispatch,
  type ReactNode,
  type SetStateAction,
} from "react";
import { usePathname, useRouter } from "next/navigation";
import {
  PreferenceControls,
  initialPlans,
  type BlogArticle,
  type Language,
  type PlanConfig,
  type Theme,
  type WebUser,
} from "@/app-shared";
import { ApiClientError, articlesApi, authApi, plansApi } from "@/lib/api";
import { mapApiArticle, mapApiPlan } from "@/lib/mappers";
import { CookieConsent } from "@/components/CookieConsent";

type AppState = {
  language: Language;
  setLanguage: (language: Language) => void;
  theme: Theme;
  setTheme: (theme: Theme) => void;
  plans: PlanConfig[];
  setPlans: Dispatch<SetStateAction<PlanConfig[]>>;
  plansLoading: boolean;
  plansError: string | null;
  articles: BlogArticle[];
  articlesLoading: boolean;
  articlesError: string | null;
  user: WebUser | null;
  authLoading: boolean;
  refreshUser: () => Promise<WebUser | null>;
  logout: () => Promise<void>;
  go: (screen: string) => void;
};

const AppContext = createContext<AppState | null>(null);

const routes: Record<string, string> = {
  landing: "/",
  onboarding: "/onboarding",
  login: "/login",
  pricing: "/pricing",
  admin: "/dashboard/admin",
  dashboard: "/dashboard/user",
  articles: "/articles",
};

function errorMessage(error: unknown): string {
  if (error instanceof ApiClientError) return error.message;
  return "تعذّر تحميل البيانات — حاول تحديث الصفحة.";
}

export function useApp() {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error("useApp must be used inside AppProviders");
  }
  return context;
}

export function AppProviders({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [plans, setPlans] = useState<PlanConfig[]>(initialPlans);
  const [plansLoading, setPlansLoading] = useState(true);
  const [plansError, setPlansError] = useState<string | null>(null);
  const [articles, setArticles] = useState<BlogArticle[]>([]);
  const [articlesLoading, setArticlesLoading] = useState(true);
  const [articlesError, setArticlesError] = useState<string | null>(null);
  const [user, setUser] = useState<WebUser | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [language, setLanguage] = useState<Language>("ar");
  const [theme, setTheme] = useState<Theme>("light");
  const [hydrated, setHydrated] = useState(false);
  const bootstrapped = useRef(false);

  useEffect(() => {
    const storedLanguage = localStorage.getItem("sharik-language");
    const storedTheme = localStorage.getItem("sharik-theme");
    if (storedLanguage === "ar" || storedLanguage === "en") {
      setLanguage(storedLanguage);
    }
    if (storedTheme === "light" || storedTheme === "dark") {
      setTheme(storedTheme);
    }
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    localStorage.setItem("sharik-language", language);
    localStorage.setItem("sharik-theme", theme);
    document.documentElement.lang = language;
    document.documentElement.dir = language === "ar" ? "rtl" : "ltr";
    document.documentElement.dataset.theme = theme;
  }, [language, theme, hydrated]);

  const refreshUser = useCallback(async () => {
    try {
      const current = await authApi.me();
      setUser(current);
      return current;
    } catch {
      setUser(null);
      return null;
    } finally {
      setAuthLoading(false);
    }
  }, []);

  const logout = useCallback(async () => {
    try {
      await authApi.logout();
    } finally {
      setUser(null);
    }
  }, []);

  useEffect(() => {
    if (bootstrapped.current) return;
    bootstrapped.current = true;

    void refreshUser();

    void (async () => {
      try {
        const rows = await plansApi.list("EG");
        setPlans(rows.map(mapApiPlan));
        setPlansError(null);
      } catch (error) {
        setPlansError(errorMessage(error));
      } finally {
        setPlansLoading(false);
      }
    })();

    void (async () => {
      try {
        const list = await articlesApi.list({ limit: 20 });
        setArticles(list.results.map(mapApiArticle));
        setArticlesError(null);
      } catch (error) {
        setArticlesError(errorMessage(error));
      } finally {
        setArticlesLoading(false);
      }
    })();
  }, [refreshUser]);

  const go = useCallback(
    (screen: string) => {
      if (screen.startsWith("article:")) {
        router.push("/articles/" + screen.slice("article:".length));
        return;
      }
      router.push(routes[screen] ?? "/");
    },
    [router],
  );

  const value = useMemo(
    () => ({
      language,
      setLanguage,
      theme,
      setTheme,
      plans,
      setPlans,
      plansLoading,
      plansError,
      articles,
      articlesLoading,
      articlesError,
      user,
      authLoading,
      refreshUser,
      logout,
      go,
    }),
    [
      language,
      theme,
      plans,
      plansLoading,
      plansError,
      articles,
      articlesLoading,
      articlesError,
      user,
      authLoading,
      refreshUser,
      logout,
      go,
    ],
  );

  return (
    <AppContext.Provider value={value}>
      <div
        className={
          "experience-root " +
          (pathname === "/" ? "landing-experience " : "") +
          (pathname.startsWith("/legal") ? "legal-experience" : "")
        }
        dir={language === "ar" ? "rtl" : "ltr"}
        data-theme={theme}
      >
        <PreferenceControls
          language={language}
          theme={theme}
          setLanguage={setLanguage}
          setTheme={setTheme}
        />
        {children}
        <CookieConsent />
      </div>
    </AppContext.Provider>
  );
}
