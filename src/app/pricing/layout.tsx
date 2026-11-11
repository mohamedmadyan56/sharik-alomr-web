import type { Metadata } from "next";
import type { ReactNode } from "react";

const description =
  "قارن باقات شريك العمر: ترشيحات أوسع، ظهور أعلى، وأدوات تواصل جادة بأسعار واضحة بدون التزامات خفية.";

export const metadata: Metadata = {
  title: "الباقات والأسعار",
  description,
  alternates: { canonical: "/pricing" },
  openGraph: {
    type: "website",
    url: "/pricing",
    title: "الباقات والأسعار | شريك العمر",
    description,
  },
};

export default function PricingLayout({
  children,
}: {
  children: ReactNode;
}) {
  return children;
}
