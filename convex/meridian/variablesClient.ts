import { meridianBotVariablesUrl } from "./apiPaths";

export type MeridianVariableRow = {
  name: string;
  value?: string | number;
  scope?: "global" | "server";
  publicDock?: boolean;
};

type MeridianVariablesResponse = {
  variables?: MeridianVariableRow[];
};

function coerceVariableValue(value: unknown): string | number | undefined {
  if (typeof value === "string" || typeof value === "number") {
    return value;
  }
  return undefined;
}

/** Returns `{vars}` template keys for published Dock pages (Meridian `variables.read`). */
export async function fetchMeridianPublicVariables(input: {
  accessToken: string;
  meridianBotId: string;
  guildId?: string;
}): Promise<Record<string, string | number>> {
  const response = await fetch(
    meridianBotVariablesUrl(input.meridianBotId, input.guildId),
    {
      headers: {
        Authorization: `Bearer ${input.accessToken}`,
        Accept: "application/json",
      },
    },
  );

  if (!response.ok) {
    return {};
  }

  let payload: MeridianVariablesResponse;
  try {
    payload = (await response.json()) as MeridianVariablesResponse;
  } catch {
    return {};
  }

  const vars: Record<string, string | number> = {};
  for (const row of payload.variables ?? []) {
    const name = row.name?.trim();
    if (!name) continue;
    if (row.publicDock === false) continue;
    const value = coerceVariableValue(row.value);
    if (value === undefined) continue;
    vars[name] = value;
  }

  return vars;
}
