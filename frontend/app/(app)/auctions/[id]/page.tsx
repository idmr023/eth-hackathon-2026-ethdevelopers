"use client";

import { useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { useAccount } from 'wagmi';
import { keccak256, encodePacked, parseUnits } from 'viem';
import {
  useCommitment,
  useCommitBid,
  useRevealBid,
  useClaimRefund,
  useSettleAuction,
} from '@/lib/web3/hooks/useBlindBidVault';
import { auctionsApi } from '@/lib/endpoints';
import { ApiError } from '@/lib/api';
import { Card, PageHeader, EmptyState } from '@/components/ui/card';
import { Button, Spinner } from '@/components/ui/button';
import { TextInput, InlineError, InlineSuccess } from '@/components/ui/input';
import { WalletButton } from '@/components/web3/WalletButton';
import { formatMoney, formatDate, shortHash } from '@/lib/format';
import { useAuth } from '@/components/is-auth-provider';
import { canManageAuctions } from '@/lib/permissions';
import { AuctionStatus } from '@/lib/types';

const TOKEN_DECIMALS = 6;

const STATUS_LABELS: Record<string, string> = {
  ACTIVE: 'Activa',
  SETTLED: 'Liquidada',
  CANCELLED: 'Cancelada',
};

const STATUS_COLORS: Record<string, string> = {
  ACTIVE: 'bg-blue-100 text-blue-800',
  SETTLED: 'bg-green-100 text-green-800',
  CANCELLED: 'bg-red-100 text-red-800',
};

function StatusBadge({ status }: { status?: string }) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
        STATUS_COLORS[status ?? ''] ?? 'bg-gray-100 text-gray-800'
      }`}
    >
      {STATUS_LABELS[status ?? ''] ?? status ?? '—'}
    </span>
  );
}

export default function AuctionDetailPage() {
  const params = useParams<{ id: string }>();
  const auctionId = params.id;
  const bigId = BigInt(auctionId ?? '0');
  const { address, isConnected } = useAccount();
  const { user } = useAuth();

  const [commitPrice, setCommitPrice] = useState('');
  const [commitSecret, setCommitSecret] = useState('');
  const [revealPrice, setRevealPrice] = useState('');
  const [revealSecret, setRevealSecret] = useState('');
  const [delegatePrice, setDelegatePrice] = useState('');
  const [delegateSecret, setDelegateSecret] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const auctionQuery = useQuery({
    queryKey: ['auction', auctionId],
    queryFn: () => auctionsApi.detail(auctionId),
    enabled: !!auctionId,
  });
  const auction = auctionQuery.data?.data;

  const biddersQuery = useQuery({
    queryKey: ['auction-bidders', auctionId],
    queryFn: () => auctionsApi.bidders(auctionId),
    enabled: !!auctionId,
  });
  const bidders = biddersQuery.data?.data ?? [];

  const commitment = useCommitment(bigId, address ?? '0x');

  const commitHook = useCommitBid();
  const revealHook = useRevealBid();
  const refundHook = useClaimRefund();
  const settleHook = useSettleAuction();

  const isActive = auction?.status === AuctionStatus.ACTIVE;

  const handleCommit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    if (!address) return;
    try {
      const hash = keccak256(
        encodePacked(
          ['uint256', 'string'],
          [parseUnits(commitPrice, TOKEN_DECIMALS), commitSecret],
        ),
      );
      commitHook.commitBid(bigId, hash);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al calcular el commitment');
    }
  };

  const handleReveal = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    if (!address) return;
    try {
      revealHook.revealBid({
        auctionId: bigId,
        bidder: address,
        price: parseUnits(revealPrice, TOKEN_DECIMALS),
        secret: revealSecret,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al revelar la oferta');
    }
  };

  const handleDelegate = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    if (!address) return;
    try {
      const { data } = await auctionsApi.delegateReveal(auctionId, {
        bidder: address,
        price: delegatePrice,
        secret: delegateSecret,
      });
      setSuccess(
        data.status === 'REVEALED'
          ? 'Oferta revelada automáticamente por el agente.'
          : 'Delegación registrada: el agente revelará tu oferta automáticamente.',
      );
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Error al delegar la revelación');
    }
  };

  const commitmentExists =
    commitment.data && commitment.data[0] !== '0x0000000000000000000000000000000000000000000000000000000000000000';

  const isWinner = !!auction?.winner && auction.winner.toLowerCase() === (address ?? '').toLowerCase();

  if (auctionQuery.isLoading) {
    return (
      <main className="flex-1 p-6 flex items-center justify-center">
        <Spinner className="size-6" />
      </main>
    );
  }

  if (!auction) {
    return (
      <main className="flex-1 p-6">
        <Card>
          <EmptyState
            icon="🏷️"
            title="Licitación no encontrada"
            description="No existe una licitación con ese ID."
          />
          <div className="flex justify-center pb-4">
            <Link href="/auctions">
              <Button variant="secondary">Volver a licitaciones</Button>
            </Link>
          </div>
        </Card>
      </main>
    );
  }

  return (
    <main className="flex-1 space-y-6 p-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <PageHeader
          title={auction.title}
          subtitle={
            <>
              Licitación #{auction.auctionId}
              <span className="ml-3">
                <StatusBadge status={auction.status} />
              </span>
            </>
          }
          actions={
            <Link href="/auctions">
              <Button variant="secondary" size="sm">
                ← Licitaciones
              </Button>
            </Link>
          }
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <Card title="Detalles">
            <dl className="grid gap-4 sm:grid-cols-2">
              <div>
                <dt className="text-xs uppercase tracking-wide text-muted">Rango de precio</dt>
                <dd className="mt-1 font-mono text-sm">
                  {formatMoney(auction.minPrice, 'USDC')} – {formatMoney(auction.maxPrice, 'USDC')}
                </dd>
              </div>
              <div>
                <dt className="text-xs uppercase tracking-wide text-muted">Stake requerido</dt>
                <dd className="mt-1 font-mono text-sm">{formatMoney(auction.stakeAmount, 'USDC')}</dd>
              </div>
              <div>
                <dt className="text-xs uppercase tracking-wide text-muted">Fin de commit</dt>
                <dd className="mt-1 text-sm">{formatDate(auction.commitEnd)}</dd>
              </div>
              <div>
                <dt className="text-xs uppercase tracking-wide text-muted">Fin de reveal</dt>
                <dd className="mt-1 text-sm">{formatDate(auction.revealEnd)}</dd>
              </div>
              <div>
                <dt className="text-xs uppercase tracking-wide text-muted">Scoring: precio</dt>
                <dd className="mt-1 text-sm">{auction.priceWeight}%</dd>
              </div>
              <div>
                <dt className="text-xs uppercase tracking-wide text-muted">Scoring: calidad IA</dt>
                <dd className="mt-1 text-sm">{auction.qualityWeight}%</dd>
              </div>
              <div>
                <dt className="text-xs uppercase tracking-wide text-muted">Organizador</dt>
                <dd className="mt-1 font-mono text-xs text-muted">{shortHash(auction.organizerAddress)}</dd>
              </div>
              <div>
                <dt className="text-xs uppercase tracking-wide text-muted">Tesorería</dt>
                <dd className="mt-1 font-mono text-xs text-muted">{shortHash(auction.treasuryAddress)}</dd>
              </div>
              {auction.winner && (
                <>
                  <div>
                    <dt className="text-xs uppercase tracking-wide text-muted">Ganador</dt>
                    <dd className="mt-1 font-mono text-xs text-primary">{shortHash(auction.winner)}</dd>
                  </div>
                  <div>
                    <dt className="text-xs uppercase tracking-wide text-muted">Precio ganador</dt>
                    <dd className="mt-1 font-mono text-sm text-green-600">
                      {formatMoney(auction.winningPrice ?? '0', 'USDC')}
                    </dd>
                  </div>
                </>
              )}
            </dl>
            {auction.description && (
              <p className="mt-4 border-t border-border/60 pt-4 text-sm text-muted">
                {auction.description}
              </p>
            )}
          </Card>

          <Card
            title="Ofertantes"
            actions={<span className="text-xs text-muted">{bidders.length} registrados</span>}
          >
            {bidders.length === 0 ? (
              <p className="py-6 text-center text-sm text-muted">
                Aún no hay ofertas comprometidas.
              </p>
            ) : (
              <ul className="divide-y divide-border/50">
                {bidders.map((bidder) => (
                  <li key={bidder} className="flex items-center justify-between py-2.5">
                    <span className="font-mono text-xs">{shortHash(bidder, 10)}</span>
                    {bidder.toLowerCase() === (address ?? '').toLowerCase() && (
                      <span className="text-xs text-primary">Tú</span>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>

        <div className="space-y-6">
          <Card title="Tu participación">
            {!isConnected ? (
              <div className="space-y-3">
                <p className="text-sm text-muted">
                  Conecta tu wallet para comprometer, revelar o delegar tu oferta.
                </p>
                <WalletButton />
              </div>
            ) : (
              <div className="space-y-4">
                {commitmentExists && (
                  <div className="rounded-md border border-border/60 bg-surface-2 px-3 py-2 text-xs">
                    <p className="text-muted">Comprometido:</p>
                    <p className="mt-1 font-mono text-primary">{shortHash(commitment.data[0], 12)}</p>
                    <p className="mt-1">
                      {commitment.data[1]
                        ? '✅ Revelado'
                        : commitment.data[3]
                          ? '↩️ Reembolsado'
                          : '🔒 Sin revelar'}
                    </p>
                  </div>
                )}

                {isActive && !commitmentExists && (
                  <form onSubmit={handleCommit} className="space-y-3 border-b border-border/60 pb-4">
                    <h3 className="text-sm font-semibold">Comprometer oferta</h3>
                    <TextInput
                      label="Precio (USDC)"
                      type="number"
                      step="0.01"
                      min="0.01"
                      value={commitPrice}
                      onChange={(e) => setCommitPrice(e.target.value)}
                      placeholder={`Entre ${auction.minPrice} y ${auction.maxPrice}`}
                      required
                    />
                    <TextInput
                      label="Secreto (guárdalo para revelar)"
                      value={commitSecret}
                      onChange={(e) => setCommitSecret(e.target.value)}
                      required
                    />
                    <Button type="submit" loading={commitHook.isPending || commitHook.isConfirming} className="w-full">
                      Comprometer oferta
                    </Button>
                  </form>
                )}

                {isActive && commitmentExists && !commitment.data[1] && (
                  <form onSubmit={handleReveal} className="space-y-3 border-b border-border/60 pb-4">
                    <h3 className="text-sm font-semibold">Revelar oferta</h3>
                    <TextInput
                      label="Precio comprometido (USDC)"
                      type="number"
                      step="0.01"
                      value={revealPrice}
                      onChange={(e) => setRevealPrice(e.target.value)}
                      required
                    />
                    <TextInput
                      label="Secreto usado al comprometer"
                      value={revealSecret}
                      onChange={(e) => setRevealSecret(e.target.value)}
                      required
                    />
                    <Button type="submit" loading={revealHook.isPending || revealHook.isConfirming} className="w-full">
                      Revelar oferta
                    </Button>
                  </form>
                )}

                {isActive && commitmentExists && !commitment.data[1] && (
                  <form onSubmit={handleDelegate} className="space-y-3 border-b border-border/60 pb-4">
                    <h3 className="text-sm font-semibold">Delegar revelación (agente)</h3>
                    <TextInput
                      label="Precio comprometido (USDC)"
                      type="number"
                      step="0.01"
                      value={delegatePrice}
                      onChange={(e) => setDelegatePrice(e.target.value)}
                      required
                    />
                    <TextInput
                      label="Secreto usado al comprometer"
                      value={delegateSecret}
                      onChange={(e) => setDelegateSecret(e.target.value)}
                      required
                    />
                    <Button type="submit" variant="secondary" className="w-full">
                      Delegar al agente
                    </Button>
                  </form>
                )}

                {!isActive && commitmentExists && commitment.data[3] && (
                  <Button
                    variant="secondary"
                    className="w-full"
                    loading={refundHook.isPending || refundHook.isConfirming}
                    onClick={() => refundHook.claimRefund(bigId)}
                  >
                    Reclamar reembolso del stake
                  </Button>
                )}

                {isWinner && (
                  <p className="rounded-md border border-emerald-400/30 bg-emerald-400/10 px-3 py-2 text-sm text-emerald-700">
                    🎉 Eres el ganador de esta licitación.
                  </p>
                )}

                <InlineError message={error} />
                <InlineSuccess message={success} />
              </div>
            )}
          </Card>

          {canManageAuctions(user) && isActive && (
            <Card title="Administración">
              <Button
                variant="secondary"
                className="w-full"
                loading={settleHook.isPending || settleHook.isConfirming}
                onClick={() => settleHook.settleAuction(bigId)}
              >
                Liquidar subasta
              </Button>
            </Card>
          )}
        </div>
      </div>
    </main>
  );
}
