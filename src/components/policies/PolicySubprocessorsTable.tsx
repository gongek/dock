import Link from "next/link";
import type { PolicySubprocessor } from "@/lib/policiesConstants";

function SubprocessorRow({
  sp,
  striped,
}: {
  sp: PolicySubprocessor;
  striped: boolean;
}) {
  return (
    <tr
      className={`border-b border-white/[0.08] last:border-b-0 ${
        striped ? "bg-white/[0.03]" : ""
      }`}
    >
      <td className="px-4 py-3 align-top font-medium text-zinc-200">
        <Link
          href={sp.href}
          target="_blank"
          rel="noreferrer"
          className="underline underline-offset-2 transition-colors hover:text-white"
        >
          {sp.name}
        </Link>
      </td>
      <td className="px-4 py-3 align-top text-zinc-400">{sp.purpose}</td>
      <td className="px-4 py-3 align-top text-zinc-400">{sp.location}</td>
      <td className="px-4 py-3 align-top text-zinc-400">{sp.dataCategories}</td>
    </tr>
  );
}

export default function PolicySubprocessorsTable({
  subprocessors,
}: {
  subprocessors: readonly PolicySubprocessor[];
}) {
  return (
    <div className="policy-scrollbar mt-4 overflow-x-auto rounded-xl border border-white/[0.08] bg-white/[0.02]">
      <table className="w-[48rem] border-collapse text-left text-sm">
        <colgroup>
          <col className="w-[10rem]" />
          <col className="w-[12rem]" />
          <col className="w-[7rem]" />
          <col />
        </colgroup>
        <thead>
          <tr className="border-b border-white/[0.08] bg-white/[0.03]">
            <th className="px-4 py-3 font-medium text-zinc-300">Subprocessor</th>
            <th className="px-4 py-3 font-medium text-zinc-300">Purpose</th>
            <th className="px-4 py-3 font-medium text-zinc-300">Location</th>
            <th className="px-4 py-3 font-medium text-zinc-300">Data processed</th>
          </tr>
        </thead>
        <tbody>
          {subprocessors.map((sp, index) => (
            <SubprocessorRow key={sp.name} sp={sp} striped={index % 2 === 1} />
          ))}
        </tbody>
      </table>
    </div>
  );
}
