import { LegalOverview } from "@/components/policies/LegalOverview";
import PolicyContainer from "@/components/policies/PolicyContainer";

export function LegalPage() {
  return (
    <PolicyContainer
      title="Legal"
      description="Terms, privacy, and other legal documents for Dock."
      isIndex
    >
      <LegalOverview />
    </PolicyContainer>
  );
}
