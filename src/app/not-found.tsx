import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "404 | Dock",
  description:
    "Umm... we couldn't find that page. It might've been moved. Or did you mistype something?",
};

export default function NotFound() {
  return (
    <div className="flex flex-1 items-center justify-center px-6">
      <div className="flex max-w-md items-start gap-5">
        <h1 className="text-2xl font-medium tracking-tight text-foreground">
          404
        </h1>
        <div className="w-px self-stretch bg-zinc-700" aria-hidden />
        <p className="text-sm leading-6 text-zinc-400">
          <span className="text-zinc-300">Umm...</span> we couldn&apos;t find
          that page. It might&apos;ve been moved. Or did you mistype something?
        </p>
      </div>
    </div>
  );
}
