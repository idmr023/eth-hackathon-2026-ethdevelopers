import { InvoiceDetailView } from "@/components/modules/invoices/invoice-detail-view";

export const metadata = { title: "Detalle de factura" };

export default async function InvoiceDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <InvoiceDetailView invoiceId={id} />;
}
