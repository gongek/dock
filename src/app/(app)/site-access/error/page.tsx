import type { Metadata } from "next";
import { SiteAccessErrorPage } from "@/components/sites/site-access-error-page";
import { resolveSiteAccessErrorFromQuery } from "@/lib/site-access-error";

export const metadata: Metadata = {
  title: "Site access error | Dock",
  description: "Could not access this Dock site.",
};

export default async function SiteAccessError({
  searchParams,
}: {
  searchParams: Promise<{
    m?: string;
    e?: string;
    slug?: string;
  }>;
}) {
  const params = await searchParams;
  const resolved = await resolveSiteAccessErrorFromQuery(params);

  return (
    <SiteAccessErrorPage
      title={resolved.title}
      message={resolved.message}
      slug={resolved.slug}
    />
  );
}
