"use client";

import { useState } from 'react';
import Link from 'next/link';
import { PageHeader, Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { formatMoney, formatDate, shortHash } from '@/lib/format';
import { useAuth } from '@/components/is-auth-provider';
import { can } from '@/lib/permissions';
import { Permissions } from '@/lib/permissions';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { apiFetch } from '@/lib/api';

const AUCTION_STATUS_LABELS: Record<number, string> = {
  0: 'ACTIVE',
  1: 'SETTLED',
  2: 'CANCELLED',
};

const AUCTION_STATUS_COLORS: Record<number, string> = {
  0: 'bg-blue-100 text-blue-800',
  1: 'bg-green-100 text-green-800',
  2: 'bg-red-100 text-red-800',
};

interface AuctionListItem {
  id: string;
  auctionId: string;
  title: string;
  status: number;
  stakeAmount: string;
  minPrice: string;
  maxPrice: string;
  commitEnd: string;
  revealEnd: string;
  organizerAddress: string;
  winner?: string;
  winningPrice?: string;
}

export function AuctionsListView() {
  const { user } = useAuth();
  const [page, setPage] = useState(1);

  // Fetch paginated auctions from backend (which syncs from chain)
  const { data: backendData, isLoading } = useQuery({
    queryKey: ['auctions', page],
    queryFn: async () => {
      const result = await apiFetch<AuctionListItem[]>('/api/auctions', {
        query: { page, limit: 10 },
      });
      return result;
    },
    placeholderData: keepPreviousData,
  });

  const auctions = backendData?.data ?? [];
  const loading = isLoading;

  const canCreateAuction = can(user, Permissions.AUCTIONS_MANAGE ?? 'AUCTIONS_MANAGE');

  return (
    <main className="flex-1 space-y-6 p-6">
      <PageHeader
        title="Licitaciones BlindBid"
        subtitle="Subastas de oferta sellada (commit-reveal) con scoring compuesto precio + calidad IA"
        actions={
          canCreateAuction ? (
            <Link href="/auctions/new">
              <Button>Crear licitación</Button>
            </Link>
          ) : undefined
        }
      />

      <Card>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left text-muted">
                <th className="pb-2 pr-4">ID</th>
                <th className="pb-2 pr-4">Título</th>
                <th className="pb-2 pr-4">Estado</th>
                <th className="pb-2 pr-4">Stake</th>
                <th className="pb-2 pr-4">Rango precio</th>
                <th className="pb-2 pr-4">Commit End</th>
                <th className="pb-2 pr-4">Reveal End</th>
                <th className="pb-2 pr-4">Organizador</th>
                <th className="pb-2 pr-4">Ganador</th>
              </tr>
            </thead>
            <tbody>
              {auctions.length === 0 && !loading ? (
                <tr>
                  <td colSpan={9} className="py-8 text-center text-muted">
                    No hay licitaciones registradas.
                  </td>
                </tr>
              ) : (
                auctions.map((auction) => (
                  <tr key={auction.id} className="border-b border-border/50">
                    <td className="py-3 pr-4 font-mono text-xs text-primary">
                      {shortHash(auction.auctionId)}
                    </td>
                    <td className="py-3 pr-4 font-medium">{auction.title}</td>
                    <td className="py-3 pr-4">
                      <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${AUCTION_STATUS_COLORS[auction.status] ?? 'bg-gray-100 text-gray-800'}`}>
                        {AUCTION_STATUS_LABELS[auction.status] ?? auction.status}
                      </span>
                    </td>
                    <td className="py-3 pr-4 font-mono text-sm">{formatMoney(auction.stakeAmount, 'USDC')}</td>
                    <td className="py-3 pr-4 font-mono text-sm">
                      {formatMoney(auction.minPrice, 'USDC')} – {formatMoney(auction.maxPrice, 'USDC')}
                    </td>
                    <td className="py-3 pr-4 text-sm">{formatDate(auction.commitEnd)}</td>
                    <td className="py-3 pr-4 text-sm">{formatDate(auction.revealEnd)}</td>
                    <td className="py-3 pr-4 font-mono text-xs text-muted">{shortHash(auction.organizerAddress)}</td>
                    <td className="py-3 pr-4">
                      {auction.winner ? (
                        <>
                          <span className="font-mono text-xs text-muted">{shortHash(auction.winner)}</span>
                          {auction.winningPrice && (
                            <span className="ml-2 font-mono text-xs text-green-600">{formatMoney(auction.winningPrice, 'USDC')}</span>
                          )}
                        </>
                      ) : (
                        <span className="text-muted">—</span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        <div className="flex justify-center mt-4 gap-2">
          <Button variant="secondary" size="sm" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1}>
            Anterior
          </Button>
          <span className="flex items-center px-3 text-sm text-muted">
            Página {page}
          </span>
          <Button variant="secondary" size="sm" onClick={() => setPage((p) => p + 1)} disabled={auctions.length < 10}>
            Siguiente
          </Button>
        </div>
      </Card>
    </main>
  );
}

export default AuctionsListView;