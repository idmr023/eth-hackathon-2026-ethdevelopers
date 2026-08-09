import type { Metadata } from "next";
import { RequireAuth } from "@/components/licitabien/require-auth";
import { ReputationView } from "@/components/licitabien/reputation-view";

export const metadata: Metadata = {
  title: "Perfil y reputación",
};

export default function LicitabienPerfilPage() {
  return (
    <RequireAuth>
      <ReputationView />
    </RequireAuth>
  );
}
