/** Shared policy metadata for Dock (Surf Online). */

/** Legal contracting party. */
export const LEGAL_OWNER_NAME = "Surf Online";

/** Customer-facing trade name for Dock at dock.surf. */
export const DOCK_TRADE_NAME = "Dock";

/** Related trade name for Meridian at meridian.surf. */
export const MERIDIAN_TRADE_NAME = "Meridian";

export const DOCK_DOMAIN = "dock.surf";
export const MERIDIAN_DOMAIN = "meridian.surf";

/** Dutch Chamber of Commerce (KvK) registration number. */
export const LEGAL_CHAMBER_OF_COMMERCE = "42127201";

export const LEGAL_JURISDICTION = "the Netherlands";
export const LEGAL_VENUE = "the courts of Gelderland, the Netherlands";
export const LEGAL_EMAIL = "legal@meridian.surf";
export const SECURITY_EMAIL = "security@meridian.surf";
export const POLICY_LAST_UPDATED = "September 17, 2026";

/** Short operator disclosure for policy intros and contact sections. */
export const DOCK_OPERATOR_DISCLOSURE = `${LEGAL_OWNER_NAME} operates ${DOCK_TRADE_NAME} (${DOCK_DOMAIN}) as a trade name, and is registered with the Dutch Chamber of Commerce (KvK) under number ${LEGAL_CHAMBER_OF_COMMERCE}.`;

export type PolicySubprocessor = {
  href: string;
  name: string;
  purpose: string;
  location: string;
  dataCategories: string;
};

export const DOCK_SUBPROCESSORS: readonly PolicySubprocessor[] = [
  {
    href: "https://convex.dev",
    name: "Convex",
    purpose: "Backend, database, authentication, and real-time API",
    location: "United States",
    dataCategories:
      "Account data, site configurations, page content, bot data records, session metadata",
  },
  {
    href: "https://vercel.com",
    name: "Vercel",
    purpose: "Frontend hosting and edge delivery",
    location: "Global",
    dataCategories: "HTTP request metadata, session cookies",
  },
  {
    href: "https://discord.com",
    name: "Discord",
    purpose: "Authentication, guild membership, and role checks",
    location: "United States",
    dataCategories: "OAuth profile fields, guild and role metadata",
  },
  {
    href: "https://cloudflare.com",
    name: "Cloudflare",
    purpose: "CDN, custom hostname SSL, edge delivery, and object storage (R2)",
    location: "Global",
    dataCategories:
      "HTTP metadata, custom domain configuration, uploaded images and file metadata",
  },
] as const;
