import { collectMeridianBotIds, resolveMeridianBot } from "./botIds";
import type { MeridianUserinfoBot, MeridianUserinfoFlow } from "./userinfo";

export type MeridianFlowCounts = {
  commands: number;
  events: number;
  functions: number;
};

function flowKindValue(flow: MeridianUserinfoFlow): string {
  const record = flow as MeridianUserinfoFlow & { type?: string };
  return record.kind ?? record.type ?? "";
}

function normalizeFlowKind(kind: string): "command" | "event" | "function" | null {
  const value = kind.trim().toLowerCase();
  if (!value) {
    return null;
  }
  if (
    value.includes("command") ||
    value.includes("slash") ||
    value === "cmd"
  ) {
    return "command";
  }
  if (
    value.includes("event") ||
    value.includes("trigger") ||
    value.includes("webhook")
  ) {
    return "event";
  }
  if (value.includes("function") || value === "fn") {
    return "function";
  }
  return null;
}

export function selectFlowsForSite(
  flows: MeridianUserinfoFlow[] | undefined,
  meridianBotId: string,
  bots?: MeridianUserinfoBot[],
): MeridianUserinfoFlow[] {
  const flowList = flows ?? [];
  if (flowList.length === 0) {
    return [];
  }

  const botIds = new Set(collectMeridianBotIds(meridianBotId, bots, flowList));
  const scoped = flowList.filter(
    (flow) => flow.botId != null && botIds.has(flow.botId),
  );
  if (scoped.length > 0) {
    return scoped;
  }

  const resolved = resolveMeridianBot(meridianBotId, bots);
  if (resolved?.id) {
    const byResolvedId = flowList.filter((flow) => flow.botId === resolved.id);
    if (byResolvedId.length > 0) {
      return byResolvedId;
    }
  }

  if ((bots?.length ?? 0) === 1) {
    return flowList;
  }

  const distinctBotIds = [
    ...new Set(
      flowList
        .map((flow) => flow.botId)
        .filter((value): value is string => Boolean(value)),
    ),
  ];
  if (distinctBotIds.length === 1) {
    return flowList;
  }

  return [];
}

export function countFlows(flows: MeridianUserinfoFlow[]): MeridianFlowCounts {
  const counts: MeridianFlowCounts = {
    commands: 0,
    events: 0,
    functions: 0,
  };

  for (const flow of flows) {
    const bucket = normalizeFlowKind(flowKindValue(flow));
    if (bucket === "command") {
      counts.commands += 1;
    } else if (bucket === "event") {
      counts.events += 1;
    } else if (bucket === "function") {
      counts.functions += 1;
    }
  }

  return counts;
}

export function countFlowsForBot(
  flows: MeridianUserinfoFlow[] | undefined,
  meridianBotId: string,
  bots?: MeridianUserinfoBot[],
): MeridianFlowCounts {
  return countFlows(selectFlowsForSite(flows, meridianBotId, bots));
}

export function readFlowCountsFromHomeStats(
  payload: Record<string, unknown> | null | undefined,
): MeridianFlowCounts | null {
  if (!payload) {
    return null;
  }

  const read = (keys: string[]) => {
    for (const key of keys) {
      const value = payload[key];
      if (typeof value === "number" && Number.isFinite(value)) {
        return value;
      }
    }
    return null;
  };

  const commands = read(["commands", "commandCount", "commandsCount"]);
  const events = read(["events", "eventCount", "eventsCount"]);
  const functions = read(["functions", "functionCount", "functionsCount"]);

  if (commands == null && events == null && functions == null) {
    return null;
  }

  return {
    commands: commands ?? 0,
    events: events ?? 0,
    functions: functions ?? 0,
  };
}
