import type { Metadata } from "next";
import { RequireAuth } from "@/components/licitabien/require-auth";
import { CuentaView } from "@/components/licitabien/cuenta-view";

export const metadata: Metadata = {
  title: "Mi cuenta",
};

export default function CuentaPage() {
  return (
    <RequireAuth>
      <CuentaView />
    </RequireAuth>
  );
}