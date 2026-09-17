import { notFound } from "next/navigation";
import type { Metadata } from "next";
import PolicyDocumentShell from "@/components/policies/PolicyDocumentShell";
import type { PolicyDocumentDefinition } from "@/components/policies/PolicyDocumentShell";

export function createPolicyDocumentHandlers(
  documents: Record<string, PolicyDocumentDefinition>,
  getDocument: (slug: string) => PolicyDocumentDefinition | undefined,
) {
  return {
    generateStaticParams() {
      return Object.keys(documents).map((slug) => ({ slug }));
    },

    async generateMetadata({
      params,
    }: {
      params: Promise<{ slug: string }>;
    }): Promise<Metadata> {
      const { slug } = await params;
      const doc = getDocument(slug);
      if (!doc) {
        return {};
      }
      return doc.metadata;
    },

    async PolicyDocumentPage({
      params,
    }: {
      params: Promise<{ slug: string }>;
    }) {
      const { slug } = await params;
      const doc = getDocument(slug);
      if (!doc) {
        notFound();
      }

      const Content = doc.Content;

      return (
        <PolicyDocumentShell containerTitle={doc.containerTitle}>
          <Content />
        </PolicyDocumentShell>
      );
    },
  };
}
