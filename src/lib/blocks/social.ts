export type SocialLinkDraft = {
  label: string;
  href: string;
};

export function parseSocialLinkDrafts(raw: unknown): SocialLinkDraft[] {
  const value = String(raw ?? "");
  if (!value.trim()) return [];
  return value.split("\n").map((line) => {
    const [label, ...rest] = line.split("|").map((cell) => cell.trim());
    return { label: label ?? "", href: rest.join("|").trim() };
  });
}

export function serializeSocialLinkDrafts(items: SocialLinkDraft[]): string {
  return items.map((item) => `${item.label} | ${item.href}`.trim()).join("\n");
}

export function updateSocialLinkDraft(
  items: SocialLinkDraft[],
  index: number,
  patch: Partial<SocialLinkDraft>,
): SocialLinkDraft[] {
  return items.map((item, itemIndex) =>
    itemIndex === index ? { ...item, ...patch } : item,
  );
}
