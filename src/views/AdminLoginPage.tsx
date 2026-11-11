"use client";

import { useState } from "react";
import type React from "react";
import { Button, Icon, Logo, type Language } from "../app-shared";
import { ApiClientError, adminApi } from "../lib/api";

export function AdminLoginPage({
  language,
  done,
  back,
}: {
  language: Language;
  done: () => void;
  back: () => void;
}) {
  const ar = language === "ar";
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [step, setStep] = useState<"password" | "twofactor">("password");
  const [challenge, setChallenge] = useState("");
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");

    if (step === "twofactor") {
      if (!/^\d{6}$/.test(code)) {
        setError(
          ar
            ? "أدخل كود التحقق المكوّن من 6 أرقام."
            : "Enter the 6-digit verification code.",
        );
        return;
      }
      setLoading(true);
      try {
        await adminApi.verifyTwoFactor({ challenge, code });
        done();
      } catch (reason) {
        setError(
          reason instanceof ApiClientError
            ? reason.message
            : ar
              ? "تعذّر التحقق — حاول مرة أخرى."
              : "Could not verify — please try again.",
        );
      } finally {
        setLoading(false);
      }
      return;
    }

    if (!email.trim() || !password) {
      setError(
        ar
          ? "أدخل البريد الإلكتروني وكلمة المرور الإدارية."
          : "Enter the admin email and password.",
      );
      return;
    }

    setLoading(true);
    try {
      const result = await adminApi.login({
        email: email.trim(),
        password,
      });
      if (result.twoFactorRequired && result.challenge) {
        setChallenge(result.challenge);
        setCode("");
        setStep("twofactor");
        return;
      }
      done();
    } catch (reason) {
      if (reason instanceof ApiClientError) {
        setError(reason.message);
      } else {
        setError(
          ar
            ? "تعذّر تسجيل الدخول — حاول مرة أخرى."
            : "Could not sign in — please try again.",
        );
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page" dir={ar ? "rtl" : "ltr"}>
      <section className="auth-brand">
        <button onClick={back} type="button">
          <Logo light language={language} />
        </button>
        <div>
          <span>
            <Icon name="shield" />{" "}
            {ar ? "دخول إداري محمي" : "Protected admin access"}
          </span>
          <h1>
            {ar ? (
              <>
                لوحة تحكم
                <br />
                شريك العمر
              </>
            ) : (
              <>
                Sharik Alomr
                <br />
                control panel
              </>
            )}
          </h1>
          <p>
            {ar
              ? "مساحة مخصصة لفريق الإدارة لمتابعة المستخدمين والتوثيق والبلاغات والمحتوى."
              : "A dedicated space for the team to manage users, verification, reports, and content."}
          </p>
        </div>
        <div className="auth-trust">
          <span>
            <Icon name="lock" /> {ar ? "جلسة إدارية منفصلة" : "Separate admin session"}
          </span>
          <span>
            <Icon name="shield" /> {ar ? "صلاحيات حسب الدور" : "Role-based permissions"}
          </span>
        </div>
      </section>

      <section className="auth-form">
        <div className="auth-card">
          <div className="auth-card-head">
            <span className="auth-icon">
              <Icon name="user" size={22} />
            </span>
            <div>
              <h2>
                {step === "twofactor"
                  ? ar
                    ? "التحقق بخطوتين"
                    : "Two-step verification"
                  : ar
                    ? "تسجيل دخول الإدارة"
                    : "Admin sign in"}
              </h2>
              <p>
                {step === "twofactor"
                  ? ar
                    ? "أدخل الكود المكوّن من 6 أرقام من تطبيق المصادقة المرتبط بحسابك."
                    : "Enter the 6-digit code from the authenticator app linked to your account."
                  : ar
                    ? "استخدم بريدك الإداري وكلمة المرور الخاصة بك."
                    : "Use your admin email and password."}
              </p>
            </div>
          </div>

          <form onSubmit={submit}>
            {error && (
              <div className="inline-feedback error" role="alert">
                {error}
              </div>
            )}

            {step === "twofactor" ? (
              <label>
                {ar ? "كود التحقق" : "Verification code"}
                <input
                  type="text"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  value={code}
                  onChange={(event) =>
                    setCode(
                      event.target.value.replace(/\D/g, "").slice(0, 6),
                    )
                  }
                  placeholder="000000"
                  dir="ltr"
                  maxLength={6}
                  autoFocus
                  required
                />
              </label>
            ) : (
              <>
                <label>
                  {ar ? "البريد الإلكتروني" : "Email"}
                  <input
                    type="email"
                    autoComplete="username"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    placeholder="admin@example.com"
                    dir="ltr"
                    required
                  />
                </label>

                <label>
                  {ar ? "كلمة المرور" : "Password"}
                  <input
                    type="password"
                    autoComplete="current-password"
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    placeholder="••••••••"
                    dir="ltr"
                    required
                  />
                </label>
              </>
            )}

            <Button type="submit" disabled={loading}>
              {loading
                ? ar
                  ? "جارٍ التحقق…"
                  : "Checking…"
                : step === "twofactor"
                  ? ar
                    ? "تأكيد ودخول لوحة التحكم"
                    : "Verify and enter dashboard"
                  : ar
                    ? "دخول لوحة التحكم"
                    : "Enter dashboard"}
            </Button>
          </form>

          {step === "twofactor" && (
            <button
              className="auth-method-link"
              type="button"
              onClick={() => {
                setStep("password");
                setChallenge("");
                setCode("");
                setError("");
              }}
            >
              {ar ? "العودة لتسجيل الدخول" : "Back to sign in"}
            </button>
          )}

          <button className="auth-method-link" type="button" onClick={back}>
            {ar ? "العودة إلى الموقع" : "Back to the website"}
          </button>
        </div>
      </section>
    </div>
  );
}
