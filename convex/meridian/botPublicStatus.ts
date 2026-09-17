import { meridianBotPublicStatusSettingsUrl } from "./apiPaths";

export type MeridianPublicStatusSettings = {
  enabled: boolean;
  publicFields?: string[];
  lastPublishedAt?: number;
};

export async function fetchMeridianPublicStatusSettings(input: {
  accessToken: string;
  meridianBotId: string;
}): Promise<MeridianPublicStatusSettings | null> {
  const response = await fetch(
    meridianBotPublicStatusSettingsUrl(input.meridianBotId),
    {
      headers: {
        Authorization: `Bearer ${input.accessToken}`,
        Accept: "application/json",
      },
    },
  );

  if (!response.ok) {
    return null;
  }

  try {
    return (await response.json()) as MeridianPublicStatusSettings;
  } catch {
    return null;
  }
}

export async function enableMeridianPublicStatus(input: {
  accessToken: string;
  meridianBotId: string;
  enabled?: boolean;
}): Promise<{ ok: boolean; settings?: MeridianPublicStatusSettings }> {
  const response = await fetch(
    meridianBotPublicStatusSettingsUrl(input.meridianBotId),
    {
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${input.accessToken}`,
        Accept: "application/json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ enabled: input.enabled ?? true }),
    },
  );

  if (!response.ok) {
    return { ok: false };
  }

  try {
    const settings = (await response.json()) as MeridianPublicStatusSettings;
    return { ok: true, settings };
  } catch {
    return { ok: true };
  }
}
