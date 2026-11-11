import type { Metadata } from "next";
import type { ReactNode } from "react";

const description =
  "مقالات ودلائل من فريق شريك العمر عن الاستعداد للزواج، التواصل الصحي، الحدود الواضحة، واختيار شريك الحياة.";

export const metadata: Metadata = {
  title: "مجلة شريك العمر",
  description,
  alternates: { canonical: "/articles" },
  openGraph: {
    type: "website",
    url: "/articles",
    title: "مجلة شريك العمر",
    description,
  },
};

export default function ArticlesLayout({
  children,
}: {
  children: ReactNode;
}) {
  return children;
}
