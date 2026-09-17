import { MeridianLogoIcon } from "@/components/oauth-icons";

const STEPS = [
  {
    step: "1",
    title: "Connect your bot",
    description: "Sign in with Meridian and link the bot you want a site for.",
    icon: "meridian" as const,
  },
  {
    step: "2",
    title: "Build the site",
    description: "Compose pages with blocks, cases, and live data from your bot.",
    icon: "dock" as const,
  },
  {
    step: "3",
    title: "Publish it",
    description: "Go live for staff and users on the same site.",
    icon: "publish" as const,
  },
];

function StepIcon({ type }: { type: "meridian" | "dock" | "publish" }) {
  if (type === "meridian") {
    return <MeridianLogoIcon className="size-5 text-zinc-200" />;
  }
  if (type === "dock") {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img src="/dock-logo.svg" alt="" width={20} height={20} className="size-5" />
    );
  }
  return <i className="bx bx-upload text-lg text-zinc-200" aria-hidden />;
}

export function ConnectionFlow() {
  return (
    <ol
      className="mt-12 grid gap-4 sm:grid-cols-3"
      aria-label="How Dock works"
    >
      {STEPS.map((item) => (
        <li
          key={item.step}
          data-landing-reveal="section"
          className="landing-card flex flex-col gap-5 p-6"
        >
          <div className="flex items-center gap-3">
            <span className="text-sm text-zinc-500">{item.step}</span>
            <div className="flex size-9 items-center justify-center rounded-full border border-white/[0.08]">
              <StepIcon type={item.icon} />
            </div>
          </div>
          <div>
            <p className="text-base font-medium text-zinc-100">{item.title}</p>
            <p className="mt-2 text-sm leading-6 text-zinc-500">
              {item.description}
            </p>
          </div>
        </li>
      ))}
    </ol>
  );
}
