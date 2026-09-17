import PolicySection from "@/components/policies/PolicySection";

export type PolicySectionDef = {
  id: string;
  title: string;
  content: React.ReactNode;
};

export default function PolicySectionsDocument({
  sections,
  compact = false,
}: {
  sections: readonly PolicySectionDef[];
  compact?: boolean;
}) {
  return (
    <div className={`flex flex-col ${compact ? "gap-5" : "gap-7"}`}>
      {sections.map((section, index) => (
        <PolicySection
          key={section.id}
          id={section.id}
          sectionNumber={index + 1}
          title={section.title}
          content={section.content}
        />
      ))}
      {compact ? <div style={{ height: 8 }} /> : <div style={{ height: 24 }} />}
    </div>
  );
}

function sectionsDocument(sections: readonly PolicySectionDef[]) {
  return function SectionsDocument({ compact = false }: { compact?: boolean }) {
    return <PolicySectionsDocument sections={sections} compact={compact} />;
  };
}

export { sectionsDocument };
