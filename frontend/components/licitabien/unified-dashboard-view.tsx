"use client";

import { useAuth } from "@/components/is-auth-provider";
import { getPersona } from "@/lib/licitabien/persona";
import { RequireAuth } from "./require-auth";
import { BuyerDashboardView } from "./buyer-dashboard-view";
import { SupplierDashboardView } from "./supplier-dashboard-view";

export function UnifiedDashboardView() {
  const { user } = useAuth();

  return (
    <RequireAuth>
      {getPersona(user) === "licitante" ? (
        <BuyerDashboardView />
      ) : (
        <SupplierDashboardView />
      )}
    </RequireAuth>
  );
}
