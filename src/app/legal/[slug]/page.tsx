import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { legalDocuments, getLegalDocument } from "@/content/legal";
import { LegalPageView } from "@/views/LegalPage";

type PageProps = {
  params: Promise<{ slug: string }>;
};

export function generateStaticParams() {
  return legalDocuments.map((document) => ({ slug: document.slug }));
}

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const document = getLegalDocument(slug);
  if (!document) return {};
  return {
    title: document.titleAr,
    description: document.summaryAr,
    alternates: {
      canonical: `/legal/${document.slug}`,
    },
    openGraph: {
      title: `${document.titleAr} | شريك العمر`,
      description: document.summaryAr,
      type: "article",
      locale: "ar_EG",
      alternateLocale: ["en_US"],
    },
  };
}

export default async function LegalRoute({ params }: PageProps) {
  const { slug } = await params;
  const document = getLegalDocument(slug);
  if (!document) notFound();
  return <LegalPageView document={document} />;
}
