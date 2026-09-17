import type { PolicyDocumentDefinition } from "@/components/policies/PolicyDocumentShell";
import {
  DpaContent,
  FairUseContent,
  LicensesContent,
  PrivacyPolicyContent,
  TermsOfServiceContent,
} from "@/components/policies/dockPolicyContent";
import { legalPath } from "@/lib/policies/legalPath";

export const DOCK_POLICY_DOCUMENTS: Record<string, PolicyDocumentDefinition> = {
  terms: {
    slug: "terms",
    metadata: {
      title: "Terms of Service",
      description: "Rules and legal agreements for using Dock.",
    },
    containerTitle: "Terms of Service",
    indexText:
      "Terms of Service Dock dock.surf trade name Surf Online KvK 42127201 rules billing refunds Discord acceptable use liability governing law Netherlands",
    Content: TermsOfServiceContent,
  },
  privacy: {
    slug: "privacy",
    metadata: {
      title: "Privacy Policy",
      description:
        "How Dock collects, uses, and protects your data, including cookies and similar technologies.",
    },
    containerTitle: "Privacy Policy",
    indexText:
      "Privacy Policy data collection subprocessors cookies session GDPR rights deletion Surf Online Dock.surf KvK 42127201",
    Content: PrivacyPolicyContent,
  },
  dpa: {
    slug: "dpa",
    metadata: {
      title: "Data Processing Agreement",
      description: "DPA for Dock site hosting and personal data processing.",
    },
    containerTitle: "Data Processing Agreement",
    indexText: "Data Processing Agreement DPA GDPR processor controller subprocessors",
    Content: DpaContent,
  },
  "fair-use": {
    slug: "fair-use",
    metadata: {
      title: "Fair Use Policy",
      description: "Shared resource limits and acceptable usage for Dock sites.",
    },
    containerTitle: "Fair Use Policy",
    indexText: "Fair Use Policy hosting bandwidth storage custom domains plan limits",
    Content: FairUseContent,
  },
  licenses: {
    slug: "licenses",
    metadata: {
      title: "Open source licenses",
      description: "Third-party packages and licenses used by Dock.",
    },
    containerTitle: "Open source licenses",
    indexText:
      "open source licenses npm dependencies MIT Apache packages third party attribution",
    Content: LicensesContent,
  },
};

export function getDockPolicyDocument(slug: string): PolicyDocumentDefinition | undefined {
  return DOCK_POLICY_DOCUMENTS[slug];
}

export function dockPolicyArticles() {
  return Object.values(DOCK_POLICY_DOCUMENTS).map((doc) => ({
    title: String(doc.metadata.title ?? doc.containerTitle),
    description: String(doc.metadata.description ?? ""),
    href: legalPath(doc.slug),
    folder: doc.slug,
    content: `${doc.metadata.title} ${doc.metadata.description} ${doc.indexText}`,
  }));
}
