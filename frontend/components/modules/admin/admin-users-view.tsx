"use client";

import { useEffect, useState } from "react";
import { usersApi, factorsApi } from "@/lib/endpoints";
import { PageHeader, Card } from "@/components/ui/card";
import { DataTable, Pagination } from "@/components/ui/table";
import { RoleBadge, Badge } from "@/components/ui/badge";
import { TextInput, Select, InlineError, InlineSuccess } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ApiError } from "@/lib/api";
import { useAsyncResource } from "@/lib/use-async-resource";
import type { Factor, User } from "@/lib/types";
import { UserStatus } from "@/lib/types";
import { formatDate } from "@/lib/format";

const PAGE_SIZE = 10;

export function AdminUsersView() {
  const [page, setPage] = useState(1);

  const { data, error, loading, reload } = useAsyncResource<User[]>(
    () => usersApi.list({ page, limit: PAGE_SIZE }),
    [page],
  );

  const rows = data?.data ?? [];
  const total = data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const [success, setSuccess] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [toggling, setToggling] = useState<string | null>(null);

  const [email, setEmail] = useState("");
  const [fullName, setFullName] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("ANALYST");
  const [factorId, setFactorId] = useState("");
  const [factors, setFactors] = useState<Factor[]>([]);
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    factorsApi
      .list()
      .then((result) => {
        if (!cancelled) setFactors(result.data);
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, []);

  async function onCreate(event: React.FormEvent) {
    event.preventDefault();
    setCreateError(null);
    setCreating(true);
    try {
      await usersApi.create({
        email,
        fullName,
        password,
        role,
        ...(factorId ? { factorId } : {}),
      });
      setSuccess(`Usuario ${email} creado.`);
      setEmail("");
      setFullName("");
      setPassword("");
      setFactorId("");
      setPage(1);
      reload();
    } catch (cause) {
      setCreateError(
        cause instanceof ApiError ? cause.message : "No se pudo crear el usuario.",
      );
    } finally {
      setCreating(false);
    }
  }

  async function toggleStatus(user: User) {
    setToggling(user.id);
    setActionError(null);
    try {
      await usersApi.updateStatus(
        user.id,
        user.status === UserStatus.ACTIVE ? UserStatus.SUSPENDED : UserStatus.ACTIVE,
      );
      reload();
    } catch (cause) {
      setActionError(
        cause instanceof ApiError ? cause.message : "No se pudo actualizar el usuario.",
      );
    } finally {
      setToggling(null);
    }
  }

  return (
    <main className="flex-1 space-y-6 p-6">
      <PageHeader
        title="Usuarios"
        subtitle="Gestión de administradores y analistas de riesgo."
      />

      <Card title="Crear usuario">
        <form onSubmit={onCreate} className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <TextInput
            label="Correo"
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="analista@factoring.pe"
          />
          <TextInput
            label="Nombre completo"
            required
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            placeholder="Ana Torres"
          />
          <TextInput
            label="Contraseña inicial"
            type="password"
            required
            minLength={8}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
          />
          <div className="grid grid-cols-2 gap-3">
            <Select
              label="Rol"
              value={role}
              onChange={(e) => setRole(e.target.value)}
              options={[
                { value: "ANALYST", label: "Analista" },
                { value: "ADMIN", label: "Admin" },
              ]}
            />
            <Select
              label="Factor"
              value={factorId}
              onChange={(e) => setFactorId(e.target.value)}
              options={[
                { value: "", label: "—" },
                ...factors.map((f) => ({ value: f.id, label: f.name })),
              ]}
            />
          </div>
          <div className="sm:col-span-2 lg:col-span-4">
            <InlineError message={createError} />
          </div>
          <div className="sm:col-span-2 lg:col-span-4 flex justify-end">
            <Button type="submit" loading={creating}>
              Crear usuario
            </Button>
          </div>
        </form>
      </Card>

      <InlineError message={error} />
      <InlineError message={actionError} />
      <InlineSuccess message={success} />

      <Card>
        <DataTable
          columns={[
            { key: "nombre", header: "Nombre" },
            { key: "correo", header: "Correo" },
            { key: "rol", header: "Rol" },
            { key: "estado", header: "Estado" },
            { key: "creado", header: "Creado" },
            { key: "acciones", header: "", headerClassName: "text-right" },
          ]}
          rows={rows.map((user) => ({
            id: user.id,
            cells: {
              nombre: user.fullName,
              correo: <span className="font-mono text-xs">{user.email}</span>,
              rol: <RoleBadge role={user.role} />,
              estado:
                user.status === UserStatus.ACTIVE ? (
                  <Badge tone="success">Activo</Badge>
                ) : (
                  <Badge tone="danger">Suspendido</Badge>
                ),
              creado: formatDate(user.createdAt),
              acciones: (
                <div className="flex justify-end">
                  <Button
                    variant="ghost"
                    size="sm"
                    loading={toggling === user.id}
                    onClick={() => toggleStatus(user)}
                  >
                    {user.status === UserStatus.ACTIVE ? "Suspender" : "Activar"}
                  </Button>
                </div>
              ),
            },
          }))}
          emptyLabel="Sin usuarios."
          loading={loading}
        />
        <Pagination page={page} totalPages={totalPages} total={total} onPage={setPage} />
      </Card>
    </main>
  );
}
