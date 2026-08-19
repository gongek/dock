import { customFetch } from "@auth/core";
import type { OAuthConfig, OAuthUserConfig } from "@auth/core/providers";
import { MERIDIAN_CALLBACK_URL, meridianFetch } from "./oauth";

export type MeridianProfile = {
  sub: string;
  meridianId?: string;
  name?: string;
  email?: string;
  discordId?: string;
  botCount?: number;
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
        scope: "user.identify offline_access",
        redirect_uri: MERIDIAN_CALLBACK_URL,
        consent: "skip",
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
      };
    },
    [customFetch]: meridianFetch,
    options: config,
  };
}
