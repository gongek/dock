import Link from "next/link";
import { dockPolicyArticles } from "@/lib/policies/dockPolicyRegistry";

export function LegalOverview() {
  const articles = dockPolicyArticles();

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      {articles.map((article) => (
        <Link
          key={article.folder}
          href={article.href}
          className="group rounded-xl border border-white/[0.08] bg-white/[0.02] p-5 transition-colors hover:border-white/[0.14] hover:bg-white/[0.04]"
        >
          <h2 className="text-base font-medium text-zinc-100">{article.title}</h2>
          <p className="mt-2 text-sm leading-relaxed text-zinc-500">
            {article.description}
          </p>
          <span className="mt-4 inline-block text-sm text-sky-400 transition-colors group-hover:text-sky-300">
            Read document →
          </span>
        </Link>
      ))}
    </div>
  );
}
