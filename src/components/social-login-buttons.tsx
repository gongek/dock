import "boxicons/css/boxicons.min.css";
import type { ReactNode } from "react";
import { DiscordAltIcon, MeridianLogoIcon } from "@/components/oauth-icons";

export type SocialLoginProvider = "meridian" | "discord";

const socialLoginButtonClass =
  "flex w-full items-center justify-center gap-2 rounded-lg px-5 py-2.5 text-sm font-medium transition-colors disabled:cursor-wait disabled:opacity-60";

function LoginButtonSpinner() {
  return (
    <i
      className="bx bx-loader-alt login-button-spinner shrink-0 text-lg leading-none"
      aria-hidden
    />
  );
}

export function SocialLoginButtons({
  pendingProvider,
  onMeridian,
  onDiscord,
  footer,
}: {
  pendingProvider: SocialLoginProvider | null;
  onMeridian: () => void;
  onDiscord: () => void;
  footer?: ReactNode;
}) {
  const disabled = pendingProvider !== null;

  return (
    <div className="flex w-full flex-col gap-3">
      <button
        type="button"
        onClick={onMeridian}
        disabled={disabled}
        aria-busy={pendingProvider === "meridian"}
        className={`${socialLoginButtonClass} bg-zinc-100 text-zinc-950 hover:bg-zinc-300`}
      >
        {pendingProvider === "meridian" ? (
          <LoginButtonSpinner />
        ) : (
          <MeridianLogoIcon className="size-5 shrink-0" />
        )}
        Continue with Meridian
      </button>
      <button
        type="button"
        onClick={onDiscord}
        disabled={disabled}
        aria-busy={pendingProvider === "discord"}
        className={`${socialLoginButtonClass} bg-[#5865F2] text-white hover:bg-[#4c58d2]`}
      >
        {pendingProvider === "discord" ? (
          <LoginButtonSpinner />
        ) : (
          <DiscordAltIcon className="size-5 shrink-0" />
        )}
        Continue with Discord
      </button>
      {footer}
    </div>
  );
}

export function SocialLoginError({ message }: { message: string }) {
  return (
    <p
      className="rounded-lg border border-red-500/20 bg-red-500/10 px-3 py-2 text-center text-xs text-red-300"
      role="alert"
    >
      {message}
    </p>
  );
}
