import { LandingFooter } from "@/components/landing/landing-footer";
import { LandingNav } from "@/components/landing/landing-nav";

type PolicyContainerProps = {
  title: string;
  description?: string;
  lastUpdated?: string;
  children: React.ReactNode;
  isIndex?: boolean;
};

export default function PolicyContainer({
  title,
  description,
  lastUpdated,
  children,
  isIndex = false,
}: PolicyContainerProps) {
  const showMetadata = !isIndex && lastUpdated;

  return (
    <div className="flex min-h-full flex-1 flex-col overflow-x-hidden">
      <LandingNav />
      <main className="flex-1 px-6 pt-28 pb-16">
        <div className={`mx-auto w-full ${isIndex ? "max-w-4xl" : "max-w-3xl"}`}>
          <header className={isIndex ? "mb-12" : "mb-10"}>
            <h1
              className={`font-medium tracking-tight text-zinc-100 ${
                isIndex ? "text-3xl sm:text-4xl" : "text-2xl sm:text-3xl"
              }`}
            >
              {title}
            </h1>
            {description ? (
              <p className="mt-4 max-w-2xl text-base leading-7 text-zinc-400">
                {description}
              </p>
            ) : null}
            {showMetadata ? (
              <p className="mt-4 text-sm text-zinc-500">
                Last updated {lastUpdated}
              </p>
            ) : null}
          </header>
          <div className="flex flex-col gap-10">{children}</div>
        </div>
      </main>
      <LandingFooter />
    </div>
  );
}
