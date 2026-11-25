import type { Metadata } from "next";
import { AdminApp } from "@/components/admin/AdminApp";

export const metadata: Metadata = {
  title: "Moderation · Lagos Street Culture Map",
  robots: { index: false, follow: false },
};

export default function AdminPage() {
  return <AdminApp />;
}
