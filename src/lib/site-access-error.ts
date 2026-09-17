export {
  SiteAccessErrorCode,
  buildSiteAccessErrorUrl,
  publicSiteAccessErrorCode,
  resolveSiteAccessErrorFromQuery,
  siteAccessErrorDetails,
} from "../../convex/lib/siteAccessError";

export type { SiteAccessErrorCodeValue } from "../../convex/lib/siteAccessError";

import {
  buildSiteAccessErrorUrl,
  type SiteAccessErrorCodeValue,
} from "../../convex/lib/siteAccessError";

export async function siteAccessErrorPageUrl(
  origin: string,
  code: SiteAccessErrorCodeValue,
  options?: { slug?: string },
): Promise<string> {
  return await buildSiteAccessErrorUrl(origin, code, options);
}
