import { policySectionDomId } from "@/lib/policies/policySectionLink";

type PolicySectionProps = {
  title: string;
  content: React.ReactNode;
  id?: string;
  sectionNumber?: number;
};

export default function PolicySection({
  title,
  content,
  id,
  sectionNumber,
}: PolicySectionProps) {
  return (
    <section
      id={id}
      data-section-number={sectionNumber}
      className="scroll-mt-28"
    >
      {sectionNumber != null ? (
        <span
          id={policySectionDomId(sectionNumber)}
          className="pointer-events-none block h-0 scroll-mt-28"
          aria-hidden
        />
      ) : null}
      <h2 className="mb-4 text-lg font-medium tracking-tight text-zinc-100">
        {title}
      </h2>
      <div className="policy-section-content text-[15px] leading-relaxed text-zinc-400">
        {content}
      </div>
    </section>
  );
}
