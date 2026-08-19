import type { Metadata } from "next";
import { DashboardPage } from "@/components/dashboard-page";

export const metadata: Metadata = {
  title: "Dashboard | Dock",
  description: "Your Dock dashboard",
};

export default function Dashboard() {
  return <DashboardPage />;
}
