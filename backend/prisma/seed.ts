import 'dotenv/config';
import { AnomalyType, InvoiceStatus, LicitacionPhase, Prisma, PrismaClient, UserRole, ValidationType } from '@prisma/client';
import { hash } from 'bcryptjs';
import { computeInvoiceHash } from '../src/shared/invoice-hash';

const prisma = new PrismaClient();
const PASSWORD_HASH_ROUNDS = 10;

async function main(): Promise<void> {
  console.log('🌱 Seeding InvoiceShield...');

  // ── Admin ───────────────────────────────────────────────────────────
  const adminEmail = process.env.SEED_ADMIN_EMAIL ?? 'admin@invoiceshield.dev';
  const adminPassword = process.env.SEED_ADMIN_PASSWORD ?? 'ChangeMe123!';
  const admin = await prisma.user.upsert({
    where: { email: adminEmail },
    update: {},
    create: {
      email: adminEmail,
      fullName: 'Administrador InvoiceShield',
      passwordHash: await hash(adminPassword, PASSWORD_HASH_ROUNDS),
      role: UserRole.ADMIN,
    },
  });
  console.log(`✓ Admin: ${adminEmail}`);

  // ── Factores demo ───────────────────────────────────────────────────
  const continental = await prisma.factor.upsert({
    where: { ruc: '20512345678' },
    update: {},
    create: { name: 'Factoring Continental', ruc: '20512345678' },
  });
  const factorPeru = await prisma.factor.upsert({
    where: { ruc: '20587654321' },
    update: {},
    create: { name: 'Factoring del Perú', ruc: '20587654321' },
  });

  const analysts = [
    { email: 'analista@continental.pe', fullName: 'Analista Factoring Continental', factorId: continental.id },
    { email: 'analista@peru.pe', fullName: 'Analista Factoring del Perú', factorId: factorPeru.id },
  ];
  for (const analyst of analysts) {
    const existing = await prisma.user.findUnique({ where: { email: analyst.email } });
    if (!existing) {
      await prisma.user.create({
        data: {
          email: analyst.email,
          fullName: analyst.fullName,
          passwordHash: await hash('Analista123!', PASSWORD_HASH_ROUNDS),
          role: UserRole.ANALYST,
          factorId: analyst.factorId,
        },
      });
    }
  }
  console.log('✓ Analistas de factor (contraseña: Analista123!)');

  // ── Facturas demo ───────────────────────────────────────────────────
  const invoiceSpecs = [
    {
      rucEmisor: '20123456789',
      rucReceptor: '20512345678',
      numero: 'F001-00000045',
      monto: 48500,
      factorId: continental.id,
      status: InvoiceStatus.VALIDATED,
      validated: true,
    },
    {
      rucEmisor: '20123456789',
      rucReceptor: '20512345678',
      numero: 'F001-00000047',
      monto: 12300,
      factorId: continental.id,
      status: InvoiceStatus.PENDING,
      validated: false,
    },
    {
      rucEmisor: '20605432101',
      rucReceptor: '20587654321',
      numero: 'F001-00000012',
      monto: 78900,
      factorId: factorPeru.id,
      status: InvoiceStatus.BLOCKED,
      validated: false,
    },
    {
      rucEmisor: '20598765432',
      rucReceptor: '20512345678',
      numero: 'F001-00000051',
      monto: 9600,
      factorId: continental.id,
      status: InvoiceStatus.PENDING,
      validated: false,
    },
  ];

  let validatedInvoiceId: string | null = null;
  for (const spec of invoiceSpecs) {
    const hashInvoice = computeInvoiceHash({
      rucEmisor: spec.rucEmisor,
      rucReceptor: spec.rucReceptor,
      numero: spec.numero,
      monto: spec.monto.toString(),
    });
    const invoice = await prisma.invoice.upsert({
      where: { hash: hashInvoice },
      update: {},
      create: {
        rucEmisor: spec.rucEmisor,
        rucReceptor: spec.rucReceptor,
        numero: spec.numero,
        monto: spec.monto,
        currency: 'PEN',
        hash: hashInvoice,
        status: spec.status,
        factorId: spec.factorId,
        registeredBy: (await prisma.user.findFirstOrThrow({ where: { factorId: spec.factorId } })).id,
        metadata: '{"simulated":true}',
      },
    });

    if (spec.validated) {
      validatedInvoiceId = invoice.id;
      await prisma.validation.upsert({
        where: { invoiceId_type: { invoiceId: invoice.id, type: ValidationType.SUNAT_CONFORMITY } },
        update: {},
        create: {
          invoiceId: invoice.id,
          type: ValidationType.SUNAT_CONFORMITY,
          signedBy: 'simulated-sunat',
          txHash: computeInvoiceHash({ rucEmisor: 'sunat', rucReceptor: 's', numero: invoice.id, monto: '1' }),
        },
      });
      await prisma.validation.upsert({
        where: { invoiceId_type: { invoiceId: invoice.id, type: ValidationType.CAVALI_FACTRACK } },
        update: {},
        create: {
          invoiceId: invoice.id,
          type: ValidationType.CAVALI_FACTRACK,
          signedBy: 'simulated-cavali',
          txHash: computeInvoiceHash({ rucEmisor: 'cavali', rucReceptor: 's', numero: invoice.id, monto: '1' }),
        },
      });
    }

    if (spec.status === InvoiceStatus.BLOCKED) {
      await prisma.anomaly.create({
        data: {
          invoiceId: invoice.id,
          type: AnomalyType.CREDIT_NOTE,
          detail: 'Nota de crédito SUNAT emitida con posterioridad',
        },
      });
    }
    console.log(`✓ Factura ${spec.numero} → ${spec.status} · ${hashInvoice.slice(0, 14)}…`);
  }

  // ── Alerta de fraude demo ───────────────────────────────────────────
  if (validatedInvoiceId) {
    const validated = await prisma.invoice.findUnique({ where: { id: validatedInvoiceId } });
    if (validated) {
      const existingAlert = await prisma.fraudAlert.findFirst({ where: { existingInvoiceId: validated.id } });
      if (!existingAlert) {
        await prisma.fraudAlert.create({
          data: {
            invoiceHash: validated.hash,
            rucEmisor: validated.rucEmisor,
            rucReceptor: validated.rucReceptor,
            numero: validated.numero,
            monto: validated.monto,
            existingFactorId: validated.factorId,
            existingInvoiceId: validated.id,
            attemptedFactorId: factorPeru.id,
            message: `Intento de doble financiamiento de la factura ${validated.numero}`,
          },
        });
        console.log('✓ Alerta de fraude demo registrada');
      }
    }
  }

  // ── Licitaciones demo LICITABIEN ────────────────────────────────────
  const inHours = (hours: number): Date =>
    new Date(Date.now() + hours * 3_600_000);
  const inMinutes = (minutes: number): Date =>
    new Date(Date.now() + minutes * 60_000);

  type DemoProvider = {
    id: string;
    name: string;
    committed: boolean;
    commitmentHash: string;
    amount: number | null;
    qualityScore: number | null;
    userId?: string | null;
  };

  const demoLicitaciones: Array<{
    id: string;
    title: string;
    category: string;
    phase: LicitacionPhase;
    budget: number;
    commitEnd: Date;
    revealEnd: Date;
    description: string;
    organizerId: string | null;
    providers: DemoProvider[];
    winnerId?: string;
    winningAmount?: number;
  }> = [
    {
      id: 'LIC-2024-001',
      title: 'Suministro de materiales de oficina Q4',
      category: 'Papelería y suministros',
      phase: LicitacionPhase.OPEN,
      budget: 8_500_000,
      organizerId: admin.id,
      commitEnd: inHours(2 * 24 + 14),
      revealEnd: inHours(2 * 24 + 15),
      description:
        'Suministro trimestral de papelería, tinta y materiales de oficina para todas las sedes.',
      providers: [
        { id: 'P-A', name: 'Proveedor A', committed: true, commitmentHash: '0x11b4879a2f3c…8b41', amount: null, qualityScore: null },
        { id: 'P-B', name: 'Proveedor B', committed: true, commitmentHash: '0x7ec219f0b041…a3f2', amount: null, qualityScore: null },
        { id: 'P-C', name: 'Proveedor C', committed: true, commitmentHash: '0x3a6c4d9e21ff…09d7', amount: null, qualityScore: null },
        { id: 'P-D', name: 'Proveedor D', committed: false, commitmentHash: '—', amount: null, qualityScore: null },
      ],
    },
    {
      id: 'LIC-2024-002',
      title: 'Servicios de limpieza corporativa 2024',
      category: 'Servicios generales',
      phase: LicitacionPhase.REVEALING,
      budget: 2_200_000,
      organizerId: admin.id,
      commitEnd: inHours(2 * 24 + 3),
      revealEnd: inMinutes(3 * 60 + 12),
      description:
        'Servicio integral de limpieza y mantenimiento de oficinas, 12 meses.',
      providers: [
        { id: 'P-E', name: 'Proveedor E', committed: true, commitmentHash: '0x88d1b2c3e4f5…71a0', amount: null, qualityScore: null },
        { id: 'P-F', name: 'Proveedor F', committed: true, commitmentHash: '0x24a9c8d7e6f5…32b1', amount: null, qualityScore: null },
        { id: 'P-G', name: 'Proveedor G', committed: true, commitmentHash: '0x5511ffaa22bb…44c2', amount: null, qualityScore: null },
      ],
    },
    {
      id: 'LIC-2024-003',
      title: 'Renovación sala de juntas principal',
      category: 'Obras y remodelación',
      phase: LicitacionPhase.DRAFT,
      budget: 15_000_000,
      organizerId: admin.id,
      commitEnd: inHours(10 * 24),
      revealEnd: inHours(11 * 24),
      description:
        'Renovación integral de la sala de juntas principal: mobiliario, AV y acústica.',
      providers: [],
    },
    {
      id: 'LIC-2024-004',
      title: 'Mantenimiento preventivo de equipos de cómputo',
      category: 'Tecnología',
      phase: LicitacionPhase.CLOSED,
      budget: 4_800_000,
      organizerId: admin.id,
      commitEnd: inHours(30 * 24),
      revealEnd: inHours(29 * 24),
      description:
        'Mantenimiento preventivo y correctivo de parque tecnológico, 12 meses.',
      providers: [
        { id: 'P-H', name: 'Proveedor H', committed: true, commitmentHash: '0xab12cd34ef56…90aa', amount: 4_080_000, qualityScore: 92 },
        { id: 'P-I', name: 'Proveedor I', committed: true, commitmentHash: '0x77fe65dc43ba…12cc', amount: 4_310_000, qualityScore: 88 },
        { id: 'P-J', name: 'Proveedor J', committed: true, commitmentHash: '0x9911bb22cc33…dd44', amount: 4_520_000, qualityScore: 84 },
        { id: 'P-K', name: 'Proveedor K', committed: true, commitmentHash: '0xc3d4e5f6a7b8…9910', amount: 4_650_000, qualityScore: 79 },
        { id: 'P-L', name: 'Proveedor L', committed: true, commitmentHash: '0x1f2e3d4c5b6a…7788', amount: 4_790_000, qualityScore: 73 },
      ],
      winnerId: 'P-H',
      winningAmount: 4_080_000,
    },
    {
      id: 'LIC-2024-005',
      title: 'Auditoría de seguridad informática 2025',
      category: 'Consultoría y seguridad',
      phase: LicitacionPhase.OPEN,
      budget: 3_600_000,
      organizerId: admin.id,
      commitEnd: inHours(3 * 24 + 6),
      revealEnd: inHours(3 * 24 + 7),
      description:
        'Auditoría externa de seguridad informática y pentesting de la infraestructura, 6 meses.',
      providers: [
        { id: 'P-M', name: 'Proveedor M', committed: true, commitmentHash: '0xd4e5f6a7b8c9…12ab', amount: null, qualityScore: null, userId: admin.id },
        { id: 'P-N', name: 'Proveedor N', committed: true, commitmentHash: '0x09d8e7f6a5b4…c3d2', amount: null, qualityScore: null },
      ],
    },
  ];

  for (const lic of demoLicitaciones) {
    await prisma.licitacion.upsert({
      where: { id: lic.id },
      update: {
        organizerId: lic.organizerId,
        phase: lic.phase,
      },
      create: {
        id: lic.id,
        title: lic.title,
        category: lic.category,
        phase: lic.phase,
        budget: lic.budget,
        commitEnd: lic.commitEnd,
        revealEnd: lic.revealEnd,
        description: lic.description,
        organizerId: lic.organizerId,
        providers: lic.providers as unknown as Prisma.InputJsonValue,
        winnerId: lic.winnerId ?? null,
        winningAmount: lic.winningAmount ?? null,
      },
    });
    console.log(`✓ Licitación ${lic.id} → ${lic.phase}`);
  }

  console.log('Seeding completo ✅');
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
