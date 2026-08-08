"use client";

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { TextInput } from '@/components/ui/input';
import { Card, PageHeader } from '@/components/ui/card';
import { InlineError } from '@/components/ui/input';
import { ApiError } from '@/lib/api';
import { auctionsApi } from '@/lib/endpoints';
import { canManageAuctions } from '@/lib/permissions';
import { useAuth } from '@/components/is-auth-provider';

export default function AuctionNewPage() {
  const { user } = useAuth();
  const router = useRouter();

  const toDatetimeLocal = (date: Date) => date.toISOString().slice(0, 16);
  const now = new Date();
  const defaultCommitEnd = toDatetimeLocal(
    new Date(now.getTime() + 24 * 60 * 60 * 1000), // +1 day
  );
  const defaultRevealEnd = toDatetimeLocal(
    new Date(now.getTime() + 48 * 60 * 60 * 1000), // +2 days
  );

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({
    title: '',
    description: '',
    stakeAmount: '1000.00',
    minPrice: '950.00',
    maxPrice: '1050.00',
    commitEnd: defaultCommitEnd,
    revealEnd: defaultRevealEnd,
    treasury: '',
  });

  if (!canManageAuctions(user)) {
    return (
      <main className="flex-1 p-6">
        <Card>
          <p className="text-center text-muted py-8">No tienes permisos para crear licitaciones.</p>
        </Card>
      </main>
    );
  }

  const handleChange = (field: string, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const commitEnd = Math.floor(new Date(form.commitEnd).getTime() / 1000);
      const revealEnd = Math.floor(new Date(form.revealEnd).getTime() / 1000);

      if (Number.isNaN(commitEnd) || Number.isNaN(revealEnd)) {
        throw new Error('Selecciona fechas válidas de commit y reveal');
      }
      if (commitEnd >= revealEnd) {
        throw new Error('La fecha de commit debe ser anterior a la de reveal');
      }
      if (commitEnd <= Math.floor(Date.now() / 1000)) {
        throw new Error('La fecha de commit debe ser futura');
      }

      const payload = {
        title: form.title,
        description: form.description || undefined,
        stakeAmount: form.stakeAmount,
        minPrice: form.minPrice,
        maxPrice: form.maxPrice,
        commitEnd: String(commitEnd),
        revealEnd: String(revealEnd),
        treasury: form.treasury || undefined,
      };

      const { data } = await auctionsApi.create(payload);
      router.push(`/auctions/${data.auctionId}`);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Error al crear la licitación');
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="flex-1 space-y-6 p-6">
      <PageHeader
        title="Crear licitación"
        subtitle="Configura una subasta de oferta sellada (commit-reveal) con scoring compuesto"
      />

      <Card>
        <form onSubmit={handleSubmit} className="space-y-6 max-w-2xl">
          <div className="grid gap-4 sm:grid-cols-2">
            <TextInput
              label="Título"
              value={form.title}
              onChange={(e) => handleChange('title', e.target.value)}
              placeholder="Ej: Licitación Factoring Q3 2026"
              required
            />
            <TextInput
              label="Stake (USDC)"
              type="number"
              step="0.01"
              min="0.01"
              value={form.stakeAmount}
              onChange={(e) => handleChange('stakeAmount', e.target.value)}
              required
            />
            <TextInput
              label="Precio mínimo (USDC)"
              type="number"
              step="0.01"
              min="0.01"
              value={form.minPrice}
              onChange={(e) => handleChange('minPrice', e.target.value)}
              required
            />
            <TextInput
              label="Precio máximo (USDC)"
              type="number"
              step="0.01"
              min="0.01"
              value={form.maxPrice}
              onChange={(e) => handleChange('maxPrice', e.target.value)}
              required
            />
            <TextInput
              label="Commit end"
              type="datetime-local"
              value={form.commitEnd}
              onChange={(e) => handleChange('commitEnd', e.target.value)}
              required
            />
            <TextInput
              label="Reveal end"
              type="datetime-local"
              value={form.revealEnd}
              onChange={(e) => handleChange('revealEnd', e.target.value)}
              required
            />
          </div>

          <TextInput
            label="Descripción (opcional)"
            value={form.description}
            onChange={(e) => handleChange('description', e.target.value)}
            placeholder="Detalles adicionales de la licitación..."
            className="sm:col-span-2"
          />

          <TextInput
            label="Treasury address (opcional)"
            value={form.treasury}
            onChange={(e) => handleChange('treasury', e.target.value)}
            placeholder="0x... (por defecto: firmante operator)"
            className="sm:col-span-2"
          />

          <InlineError message={error} />

          <div className="flex justify-end gap-3 pt-4 border-t border-border">
            <Button type="button" variant="secondary" onClick={() => router.back()}>
              Cancelar
            </Button>
            <Button type="submit" loading={loading}>
              Crear licitación
            </Button>
          </div>
        </form>
      </Card>
    </main>
  );
}