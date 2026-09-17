"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

export type PackageLicenseEntry = {
  name: string;
  version: string;
  license: string;
  url: string;
};

export type PackageLicenseSection = {
  id: string;
  title: string;
  packages: PackageLicenseEntry[];
};

type PolicyLicensesClientProps = {
  sections: PackageLicenseSection[];
};

function LicenseRow({
  pkg,
  striped,
}: {
  pkg: PackageLicenseEntry;
  striped: boolean;
}) {
  return (
    <tr
      className={`border-b border-white/[0.08] last:border-b-0 ${
        striped ? "bg-white/[0.03]" : ""
      }`}
    >
      <td className="px-4 py-3 align-top font-mono text-[13px] text-zinc-200">
        <Link
          href={pkg.url}
          target="_blank"
          rel="noreferrer"
          className="underline underline-offset-2 transition-colors hover:text-white"
        >
          {pkg.name}
        </Link>
      </td>
      <td className="px-4 py-3 align-top font-mono text-[13px] text-zinc-400">{pkg.version}</td>
      <td className="px-4 py-3 align-top text-sm text-zinc-400">{pkg.license}</td>
    </tr>
  );
}

function LicenseSectionTable({
  section,
  searchQuery,
}: {
  section: PackageLicenseSection;
  searchQuery: string;
}) {
  const filtered = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return section.packages;
    return section.packages.filter(
      (pkg) =>
        pkg.name.toLowerCase().includes(query) ||
        pkg.version.toLowerCase().includes(query) ||
        pkg.license.toLowerCase().includes(query),
    );
  }, [section.packages, searchQuery]);

  return (
    <section>
      <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="text-base font-medium text-zinc-100">{section.title}</h2>
        <p className="text-sm text-zinc-500">
          {searchQuery.trim()
            ? `${filtered.length} of ${section.packages.length} packages`
            : `${section.packages.length} packages`}
        </p>
      </div>
      <div className="policy-scrollbar overflow-x-auto rounded-xl border border-white/[0.08] bg-white/[0.02]">
        <table className="w-full min-w-[40rem] border-collapse text-left text-sm">
          <thead>
            <tr className="border-b border-white/[0.08] bg-white/[0.03]">
              <th className="px-4 py-3 font-medium text-zinc-300">Package</th>
              <th className="px-4 py-3 font-medium text-zinc-300">Version</th>
              <th className="px-4 py-3 font-medium text-zinc-300">License</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length > 0 ? (
              filtered.map((pkg, index) => (
                <LicenseRow key={`${pkg.name}@${pkg.version}`} pkg={pkg} striped={index % 2 === 1} />
              ))
            ) : (
              <tr>
                <td colSpan={3} className="px-4 py-8 text-center text-sm text-zinc-500">
                  No packages match your search in this section.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}

export default function PolicyLicensesClient({ sections }: PolicyLicensesClientProps) {
  const [searchQuery, setSearchQuery] = useState("");

  return (
    <div className="flex flex-col gap-8">
      <p className="text-sm leading-relaxed text-zinc-400">
        Dock is built with open source software. The tables below list production npm packages used
        by Dock, with their SPDX license identifiers. For full license text, follow the package
        link.
      </p>

      <div className="relative">
        <input
          type="search"
          name="license-search"
          autoComplete="off"
          autoCorrect="off"
          spellCheck={false}
          placeholder="Search packages, versions, or licenses..."
          value={searchQuery}
          onChange={(event) => setSearchQuery(event.target.value)}
          className="h-12 w-full rounded-xl border border-white/[0.08] bg-white/[0.02] px-4 text-sm text-zinc-100 placeholder:text-zinc-500 focus:border-white/[0.14] focus:outline-none"
        />
      </div>

      {sections.map((section) => (
        <LicenseSectionTable key={section.id} section={section} searchQuery={searchQuery} />
      ))}
    </div>
  );
}
