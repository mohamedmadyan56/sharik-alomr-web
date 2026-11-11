/**
 * تحميل Google Identity Services في المتصفح وطلب access token.
 * التحقق الفعلي من التوكن بيحصل في الـ BFF — هنا مسؤولية الواجهة فقط.
 */

const GIS_SCRIPT_ID = "google-identity-services"
const GIS_SCRIPT_URL = "https://accounts.google.com/gsi/client"
const SCRIPT_TIMEOUT_MS = 15_000
const TOKEN_TIMEOUT_MS = 120_000

type GoogleTokenResponse = {
  access_token?: string
  expires_in?: number
  scope?: string
  token_type?: string
  error?: string
  error_description?: string
}

type GoogleErrorResponse = {
  type?: string
  message?: string
}

type GoogleTokenClient = {
  requestAccessToken: (config?: { prompt?: string }) => void
}

type GoogleOAuth2 = {
  initTokenClient: (config: {
    client_id: string
    scope: string
    callback: (response: GoogleTokenResponse) => void
    error_callback?: (error: GoogleErrorResponse) => void
  }) => GoogleTokenClient
}

declare global {
  interface Window {
    google?: {
      accounts?: {
        oauth2?: GoogleOAuth2
      }
    }
  }
}

export type GoogleAuthErrorCode = "cancelled" | "popup_blocked" | "script_failed" | "timeout" | "failed"

export class GoogleAuthError extends Error {
  readonly code: GoogleAuthErrorCode

  constructor(code: GoogleAuthErrorCode, message: string) {
    super(message)
    this.name = "GoogleAuthError"
    this.code = code
  }
}

let scriptPromise: Promise<void> | null = null

export function loadGoogleIdentity(): Promise<void> {
  if (typeof window === "undefined") {
    return Promise.reject(
      new GoogleAuthError(
        "script_failed",
        "Google Identity Services requires a browser.",
      ),
    )
  }

  if (window.google?.accounts?.oauth2) return Promise.resolve()
  if (scriptPromise) return scriptPromise

  scriptPromise = new Promise<void>((resolve, reject) => {
    const existing = document.getElementById(
      GIS_SCRIPT_ID,
    ) as HTMLScriptElement | null
    const script = existing ?? document.createElement("script")
    let settled = false

    const timer = window.setTimeout(() => {
      if (settled) return
      settled = true
      scriptPromise = null
      reject(
        new GoogleAuthError(
          "script_failed",
          "تعذّر تحميل خدمة جوجل — تحقق من الاتصال بالإنترنت.",
        ),
      )
    }, SCRIPT_TIMEOUT_MS)

    const finish = (error?: GoogleAuthError) => {
      if (settled) return
      settled = true
      window.clearTimeout(timer)
      if (error) {
        scriptPromise = null
        reject(error)
        return
      }
      if (window.google?.accounts?.oauth2) {
        resolve()
      } else {
        scriptPromise = null
        reject(
          new GoogleAuthError("script_failed", "خدمة جوجل لم تُحمّل بشكل صحيح."),
        )
      }
    }

    script.addEventListener("load", () => finish(), { once: true })
    script.addEventListener(
      "error",
      () =>
        finish(new GoogleAuthError("script_failed", "تعذّر تحميل خدمة جوجل.")),
      { once: true },
    )

    if (!existing) {
      script.id = GIS_SCRIPT_ID
      script.src = GIS_SCRIPT_URL
      script.async = true
      script.defer = true
      document.head.appendChild(script)
    }
  })

  return scriptPromise
}

function tokenErrorFromGoogle(error: GoogleErrorResponse): GoogleAuthError {
  const type = error.type ?? ""
  if (type === "popup_closed" || type === "popup_closed_by_user") {
    return new GoogleAuthError(
      "cancelled",
      "أُغلقت نافذة جوجل قبل إكمال الدخول.",
    )
  }
  if (type === "popup_failed_to_open") {
    return new GoogleAuthError(
      "popup_blocked",
      "المتصفح منع نافذة جوجل — اسمح بالنوافذ المنبثقة وحاول مرة أخرى.",
    )
  }
  if (type === "access_denied") {
    return new GoogleAuthError("cancelled", "تم رفض الوصول إلى حساب جوجل.")
  }
  return new GoogleAuthError(
    "failed",
    error.message || "تعذّر إكمال الدخول عبر جوجل.",
  )
}

export function requestGoogleAccessToken(clientId: string): Promise<string> {
  return new Promise<string>((resolve, reject) => {
    const oauth2 = window.google?.accounts?.oauth2
    if (!oauth2) {
      reject(new GoogleAuthError("script_failed", "خدمة جوجل غير متاحة."))
      return
    }

    let settled = false
    const timer = window.setTimeout(() => {
      if (settled) return
      settled = true
      reject(
        new GoogleAuthError(
          "timeout",
          "انتهت مهلة الدخول عبر جوجل — حاول مرة أخرى.",
        ),
      )
    }, TOKEN_TIMEOUT_MS)

    const finish = (error?: GoogleAuthError, accessToken?: string) => {
      if (settled) return
      settled = true
      window.clearTimeout(timer)
      if (error) reject(error)
      else resolve(accessToken as string)
    }

    const client = (() => {
      try {
        return oauth2.initTokenClient({
          client_id: clientId,
          scope: "openid email profile",
          callback: (response) => {
            if (response.error) {
              finish(
                response.error === "access_denied"
                  ? new GoogleAuthError(
                      "cancelled",
                      "تم رفض الوصول إلى حساب جوجل.",
                    )
                  : new GoogleAuthError(
                      "failed",
                      response.error_description ||
                        "تعذّر إكمال الدخول عبر جوجل.",
                    ),
              )
              return
            }
            if (!response.access_token) {
              finish(
                new GoogleAuthError(
                  "failed",
                  "لم يصل توكن جوجل — حاول مرة أخرى.",
                ),
              )
              return
            }
            finish(undefined, response.access_token)
          },
          error_callback: (error) => finish(tokenErrorFromGoogle(error)),
        })
      } catch {
        finish(
          new GoogleAuthError(
            "failed",
            "تعذّر تهيئة الدخول عبر جوجل — حاول مرة أخرى.",
          ),
        )
        return null
      }
    })()

    if (!client) return

    try {
      client.requestAccessToken({ prompt: "select_account" })
    } catch {
      finish(
        new GoogleAuthError(
          "popup_blocked",
          "تعذّر فتح نافذة جوجل — اسمح بالنوافذ المنبثقة وحاول مرة أخرى.",
        ),
      )
    }
  })
}
