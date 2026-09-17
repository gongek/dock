import { ConnectionFlow } from "@/components/landing/connection-flow";
import {
  CasesMock,
  DiscordSignInMock,
  DomainMock,
  EditorMock,
} from "@/components/landing/landing-capability-mocks";

const FEATURES = [
  {
    title: "Visual editor",
    description:
      "Compose pages with headings, graphs, tables, cases, and more. No code required.",
    mock: <EditorMock />,
  },
  {
    title: "Discord sign-in",
    description: "Staff sign in with Discord. You choose who can edit and who can view.",
    mock: <DiscordSignInMock />,
  },
  {
    title: "Custom domains",
    description:
      "Connect your own domain so users reach the dashboard from a URL you own.",
    mock: <DomainMock />,
  },
  {
    title: "Case collections",
    description:
      "Show appeals, reports, and tickets from your bot directly on the page.",
    mock: <CasesMock />,
  },
];

export function FeaturesSection() {
  return (
    <section
      className="px-6 py-20 sm:py-28"
      aria-labelledby="features-heading"
    >
      <div className="mx-auto max-w-6xl">
        <div data-landing-reveal="section">
          <h2
            id="features-heading"
            className="text-3xl font-medium tracking-tight text-zinc-100 sm:text-4xl"
          >
            What goes on the site
          </h2>
          <p className="mt-4 max-w-lg text-base leading-7 text-zinc-400">
            From the first page to a custom domain, built for Meridian communities.
          </p>
        </div>

        <ConnectionFlow />

        <div className="mt-12 grid gap-4 sm:mt-16 lg:grid-cols-2">
          {FEATURES.map((feature) => (
            <article
              key={feature.title}
              data-landing-reveal="section"
              className="landing-card overflow-hidden"
            >
              <div className="p-6">
                <h3 className="text-base font-medium text-zinc-100">
                  {feature.title}
                </h3>
                <p className="mt-2 text-sm leading-6 text-zinc-500">
                  {feature.description}
                </p>
              </div>
              <div className="border-t border-white/[0.06] px-6 py-5">
                {feature.mock}
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
