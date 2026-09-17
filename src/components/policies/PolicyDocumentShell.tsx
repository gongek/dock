import type { Metadata } from "next";
import PolicyContainer from "@/components/policies/PolicyContainer";
import { POLICY_LAST_UPDATED } from "@/lib/policiesConstants";

type PolicyDocumentShellProps = {
  containerTitle: string;
  children: React.ReactNode;
};

export default function PolicyDocumentShell({
  containerTitle,
  children,
}: PolicyDocumentShellProps) {
  return (
    <PolicyContainer title={containerTitle} lastUpdated={POLICY_LAST_UPDATED}>
      {children}
    </PolicyContainer>
  );
}

export type PolicyDocumentDefinition = {
  slug: string;
  metadata: Metadata;
  containerTitle: string;
  indexText: string;
  Content: React.ComponentType<{ compact?: boolean }>;
};
