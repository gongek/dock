import { redirect } from "next/navigation";
import { legalPath } from "@/lib/policies/legalPath";

export default function CookiesRedirectPage() {
  redirect(`${legalPath("privacy")}#cookies`);
}
