import Link from "next/link";
import { legalPath } from "@/lib/policies/legalPath";

export function AuthLegalFooter({ className = "mt-6" }: { className?: string }) {
  return (
    <p className={`text-center text-xs leading-5 text-zinc-600 ${className}`}>
      By continuing, you agree to our{" "}
      <Link
        href={legalPath("terms")}
        className="text-zinc-400 underline underline-offset-2 transition-colors hover:text-zinc-200"
      >
        Terms of Service
      </Link>{" "}
      and{" "}
      <Link
        href={legalPath("privacy")}
        className="text-zinc-400 underline underline-offset-2 transition-colors hover:text-zinc-200"
      >
        Privacy Policy
      </Link>
      .
    </p>
  );
}
