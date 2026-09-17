"use node";

import { action } from "../_generated/server";
import {
  DOCK_BOT_SELECT_CLIENT_PARAM,
  formatDockOnboardingBotSelectClientParam,
} from "../../shared/dockBotSelectHandoff";
import { MERIDIAN_ORIGIN } from "./apiPaths";

function meridianSelectOrigin(): string {
  const configured = process.env.MERIDIAN_APEX_ORIGIN?.trim().replace(/\/$/, "");
  return configured || MERIDIAN_ORIGIN;
}

export const buildMeridianBotSelectHandoffUrl = action({
  args: {},
  handler: async () => {
    const url = new URL("/select", meridianSelectOrigin());
    url.searchParams.set(
      DOCK_BOT_SELECT_CLIENT_PARAM,
      formatDockOnboardingBotSelectClientParam(process.env.SITE_URL),
    );
    return url.toString();
  },
});
