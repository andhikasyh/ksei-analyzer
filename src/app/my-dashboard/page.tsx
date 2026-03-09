import type { Metadata } from "next";
import { DashboardBuilder } from "@/components/dashboard-builder/DashboardBuilder";
import { getBaseUrl, SITE_NAME } from "@/lib/site";

export const metadata: Metadata = {
  title: `Custom Dashboard - ${SITE_NAME}`,
  description: "Build your custom stock analysis dashboard with drag-and-drop widgets. Charts, screeners, broker data, news, and more.",
  alternates: { canonical: `${getBaseUrl()}/my-dashboard` },
};

export default function MyDashboardPage() {
  return <DashboardBuilder />;
}
