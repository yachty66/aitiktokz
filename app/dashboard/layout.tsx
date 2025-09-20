import type { ReactNode } from "react";
import { Sidebar } from "@/components/dashboard/Sidebar";

export default function DashboardLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen grid grid-cols-1 md:grid-cols-[auto,1fr]">
      <Sidebar />
      <main className="p-4 md:p-6 lg:p-8 space-y-6">{children}</main>
    </div>
  );
}
