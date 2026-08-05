import { Suspense } from "react";
import { InvoicesListView } from "@/components/modules/invoices/invoices-list-view";
import { Spinner } from "@/components/ui/button";

export const metadata = { title: "Facturas" };

export default function InvoicesPage() {
  return (
    <Suspense
      fallback={
        <main className="flex flex-1 items-center justify-center gap-2 p-6 text-muted">
          <Spinner /> Cargando facturas…
        </main>
      }
    >
      <InvoicesListView />
    </Suspense>
  );
}
