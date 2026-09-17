import type { Id } from "../_generated/dataModel";

export type SiteCustomDomainRecord = {
  _id: Id<"siteCustomDomains">;
  siteId: Id<"sites">;
  hostname: string;
  status: "pending" | "active" | "failed";
  sslStatus?: string;
  verificationJson?: string;
  lastError?: string;
  createdAt: number;
  updatedAt: number;
  verifiedAt?: number;
};
