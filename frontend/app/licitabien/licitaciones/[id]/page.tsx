"use client";

import { useParams } from "next/navigation";
import { LicitacionDetailView } from "@/components/licitabien/licitacion-detail-view";

export default function LicitacionDetailPage() {
  const params = useParams<{ id: string }>();
  return <LicitacionDetailView id={params.id} />;
}
