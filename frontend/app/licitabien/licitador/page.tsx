import type { Metadata } from "next";
import { RequireAuth } from "@/components/licitabien/require-auth";
import { SupplierDashboardView } from "@/components/licitabien/supplier-dashboard-view";

export const metadata: Metadata = {
  title: "Panel licitador",
};

export default function LicitabienLicitadorPage() {
  return (
    <RequireAuth>
      <SupplierDashboardView />
    </RequireAuth>
  );
}
