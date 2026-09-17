import { customFetch } from "@auth/core";
import type { OAuthConfig, OAuthUserConfig } from "@auth/core/providers";
import { MERIDIAN_CALLBACK_URL, meridianFetch } from "./oauth";
import { DOCK_MERIDIAN_OAUTH_SCOPES_CORE } from "./meridian/scopes";

export type MeridianProfile = {
  sub: string;
  meridianId?: string;
  name?: string;
  email?: string;
  discordId?: string;
  botCount?: number;
  isMeridianStaff?: boolean;
};

export default function Meridian(
  config: OAuthUserConfig<MeridianProfile> = {},
): OAuthConfig<MeridianProfile> {
  return {
    id: "meridian",
    name: "Meridian",
    type: "oauth",
    checks: ["state"],
    client: {
      token_endpoint_auth_method: "client_secret_post",
    },
    authorization: {
      url: "https://meridian.surf/auth/consent",
      params: {
        response_type: "code",
        scope: DOCK_MERIDIAN_OAUTH_SCOPES_CORE,
        redirect_uri: MERIDIAN_CALLBACK_URL,
      },
    },
    token: "https://meridian.surf/api/oauth/token",
    userinfo: "https://meridian.surf/api/oauth/userinfo",
    profile(profile) {
      return {
        id: profile.sub,
        name: profile.name ?? "Meridian user",
        email: profile.email,
        meridianId: profile.sub,
        discordId: profile.discordId,
      };
    },
    [customFetch]: meridianFetch,
    options: config,
  };
}
