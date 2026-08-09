import type { Metadata } from "next";
import { RequireAuth } from "@/components/licitabien/require-auth";
import { BuyerDashboardView } from "@/components/licitabien/buyer-dashboard-view";

export const metadata: Metadata = {
  title: "Panel licitante",
};

export default function LicitabienLicitantePage() {
  return (
    <RequireAuth>
      <BuyerDashboardView />
    </RequireAuth>
  );
}
