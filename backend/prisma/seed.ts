import 'dotenv/config';
import { AnomalyType, InvoiceStatus, LicitacionPhase, Prisma, PrismaClient, UserRole, ValidationType } from '@prisma/client';
import { hash } from 'bcryptjs';
import { computeInvoiceHash } from '../src/shared/invoice-hash';

const prisma = new PrismaClient();
const PASSWORD_HASH_ROUNDS = 10;

const RECOVERY_QUESTION = '¿Cuál es el RUC base de tu empresa?';
const RECOVERY_ANSWER = 'invoice123';

async function main(): Promise<void> {
  console.log('🌱 Seeding InvoiceShield...');
  const recoveryAnswerHash = await hash(RECOVERY_ANSWER, PASSWORD_HASH_ROUNDS);

  // ── Admin ───────────────────────────────────────────────────────────
  const adminEmail = process.env.SEED_ADMIN_EMAIL ?? 'admin@invoiceshield.dev';
  const adminPassword = process.env.SEED_ADMIN_PASSWORD ?? 'ChangeMe123!';
  const admin = await prisma.user.upsert({
    where: { email: adminEmail },
    update: {
      phone: '999999999',
      dni: '12345678',
      recoveryQuestion: RECOVERY_QUESTION,
      recoveryAnswerHash: recoveryAnswerHash,
    },
    create: {
      email: adminEmail,
      fullName: 'Administrador InvoiceShield',
      passwordHash: await hash(adminPassword, PASSWORD_HASH_ROUNDS),
      role: UserRole.ADMIN,
      phone: '999999999',
      dni: '12345678',
      recoveryQuestion: RECOVERY_QUESTION,
      recoveryAnswerHash: recoveryAnswerHash,
    },
  });
  console.log(`✓ Admin: ${adminEmail}`);

  // ── Usuarios licitadores (compradores) ──────────────────────────────
  const compradores = [
    { email: 'compras@grupogea.pe', fullName: 'Maria Elena Rodriguez', dni: '45123678', phone: '984111222' },
    { email: 'licitaciones@osce.gob.pe', fullName: 'Juan Carlos Mesa', dni: '78234561', phone: '991222333' },
    { email: 'admin@sanpablo.pe', fullName: 'Claudia Vargas', dni: '32456789', phone: '978333444' },
  ];
  const compradorUsers = [];
  for (const c of compradores) {
    const existing = await prisma.user.findUnique({ where: { email: c.email } });
    if (!existing) {
      const user = await prisma.user.create({
        data: {
          email: c.email,
          fullName: c.fullName,
          passwordHash: await hash('Compras123!', PASSWORD_HASH_ROUNDS),
          role: UserRole.ANALYST,
          phone: c.phone,
          dni: c.dni,
          recoveryQuestion: RECOVERY_QUESTION,
          recoveryAnswerHash: recoveryAnswerHash,
        },
      });
      compradorUsers.push(user);
    } else {
      compradorUsers.push(existing);
    }
  }
  console.log('✓ Compradores (contraseña: Compras123!)');

  // ── Usuarios proveedores ────────────────────────────────────────────
  const proveedores = [
    { email: 'ventas@techsolutions.pe', fullName: 'TechSolutions SAC', dni: '20555123456', phone: '981444555' },
    { email: 'ofertas@construccionesln.pe', fullName: 'Construcciones del Norte SAC', dni: '20611234567', phone: '972555666' },
    { email: 'contacto@limpiezapro.pe', fullName: 'LimpiezaPro EIRL', dni: '20399887766', phone: '963666777' },
    { email: 'ventas@seguridadcorp.pe', fullName: 'SeguridadCorp SAC', dni: '20488776655', phone: '954777888' },
    { email: 'info@suministrosglobal.pe', fullName: 'Suministros Global SAC', dni: '20577665544', phone: '945888999' },
    { email: 'proyectos@innovatec.pe', fullName: 'InnoVatec Consultores SAC', dni: '20666554433', phone: '936999000' },
  ];
  const proveedorUsers = [];
  for (const p of proveedores) {
    const existing = await prisma.user.findUnique({ where: { email: p.email } });
    if (!existing) {
      const user = await prisma.user.create({
        data: {
          email: p.email,
          fullName: p.fullName,
          passwordHash: await hash('Proveedor123!', PASSWORD_HASH_ROUNDS),
          role: UserRole.ANALYST,
          phone: p.phone,
          dni: p.dni,
          recoveryQuestion: RECOVERY_QUESTION,
          recoveryAnswerHash: recoveryAnswerHash,
        },
      });
      proveedorUsers.push(user);
    } else {
      proveedorUsers.push(existing);
    }
  }
  console.log('✓ Proveedores (contraseña: Proveedor123!)');

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
    { email: 'analista@continental.pe', fullName: 'Analista Factoring Continental', factorId: continental.id, dni: '23456789', phone: '999000001' },
    { email: 'analista@peru.pe', fullName: 'Analista Factoring del Perú', factorId: factorPeru.id, dni: '34567890', phone: '999000002' },
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
          phone: analyst.phone,
          dni: analyst.dni,
          recoveryQuestion: RECOVERY_QUESTION,
          recoveryAnswerHash: recoveryAnswerHash,
        },
      });
    } else {
      await prisma.user.update({
        where: { email: analyst.email },
        data: {
          phone: analyst.phone,
          dni: analyst.dni,
          recoveryQuestion: RECOVERY_QUESTION,
          recoveryAnswerHash: recoveryAnswerHash,
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

  // ── Licitaciones LICITABIEN ─────────────────────────────────────────
  // Organizadores: admin y compradores
  const orgAdmin = admin.id;
  const orgCompras = compradorUsers[0]?.id ?? admin.id;
  const orgOSCE = compradorUsers[1]?.id ?? admin.id;
  const orgSanPablo = compradorUsers[2]?.id ?? admin.id;

  // Proveedores
  const pv = proveedorUsers;

  const inDays = (days: number): Date => new Date(Date.now() + days * 86_400_000);
  const inHours = (hours: number): Date => new Date(Date.now() + hours * 3_600_000);
  const inMinutes = (minutes: number): Date => new Date(Date.now() + minutes * 60_000);

  type SeedProvider = {
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
    organizerId: string;
    providers: SeedProvider[];
    winnerId?: string;
    winningAmount?: number;
  }> = [
    // ── OPEN: 3 licitaciones activas ──
    {
      id: 'LIC-2026-001',
      title: 'Suministro de materiales de oficina Q3 2026',
      category: 'Papelería y suministros',
      phase: LicitacionPhase.OPEN,
      budget: 850_000,
      commitEnd: inDays(3),
      revealEnd: inDays(4),
      description: 'Compra trimestral de papelería, tinta, tóner y materiales de oficina para 12 sedes a nivel nacional. Incluye entrega en Lima, Arequipa y Trujillo.',
      organizerId: orgCompras,
      providers: [
        { id: 'pv-01', name: 'Suministros Global SAC', committed: true, commitmentHash: '0x11b4879a2f3c8e91d04b…8b41', amount: null, qualityScore: null, userId: pv[0]?.id },
        { id: 'pv-02', name: 'TechSolutions SAC', committed: true, commitmentHash: '0x7ec219f0b04153aa9c2e…a3f2', amount: null, qualityScore: null, userId: pv[1]?.id },
        { id: 'pv-03', name: 'InnoVatec Consultores SAC', committed: false, commitmentHash: '—', amount: null, qualityScore: null },
      ],
    },
    {
      id: 'LIC-2026-002',
      title: 'Auditoría de seguridad informática 2026',
      category: 'Consultoría y seguridad TI',
      phase: LicitacionPhase.OPEN,
      budget: 320_000,
      commitEnd: inDays(5),
      revealEnd: inDays(6),
      description: 'Auditoría externa de seguridad informática, pentesting de infraestructura cloud y evaluación de políticas ISO 27001. Duración: 3 meses.',
      organizerId: orgAdmin,
      providers: [
        { id: 'pv-04', name: 'SeguridadCorp SAC', committed: true, commitmentHash: '0xd4e5f6a7b8c901ab23cd…12ab', amount: null, qualityScore: null, userId: pv[3]?.id },
        { id: 'pv-05', name: 'InnoVatec Consultores SAC', committed: true, commitmentHash: '0x09d8e7f6a5b4c3d2e1f0…c3d2', amount: null, qualityScore: null, userId: pv[5]?.id },
      ],
    },
    {
      id: 'LIC-2026-003',
      title: 'Servicio de limpieza corporativa 2026-2027',
      category: 'Servicios generales',
      phase: LicitacionPhase.OPEN,
      budget: 1_440_000,
      commitEnd: inDays(2),
      revealEnd: inDays(3),
      description: 'Servicio integral de limpieza y sanitización para oficinas centrales (2,400 m²). Incluye mobiliario de limpieza, productos eco-friendly y personal capacitado.',
      organizerId: orgCompras,
      providers: [
        { id: 'pv-06', name: 'LimpiezaPro EIRL', committed: true, commitmentHash: '0x88d1b2c3e4f56a7b8c9d…71a0', amount: null, qualityScore: null, userId: pv[2]?.id },
      ],
    },

    // ── REVEALING: 1 licitación en revelación ──
    {
      id: 'LIC-2026-004',
      title: 'Mantenimiento preventivo de equipos de cómputo',
      category: 'Tecnología',
      phase: LicitacionPhase.REVEALING,
      budget: 560_000,
      commitEnd: inHours(-12),
      revealEnd: inHours(12),
      description: 'Mantenimiento preventivo y correctivo de 200 equipos de cómputo, 50 impresoras y 20 servidores. Incluye repuestos y soporte on-site.',
      organizerId: orgSanPablo,
      providers: [
        { id: 'pv-07', name: 'TechSolutions SAC', committed: true, commitmentHash: '0xab12cd34ef567890ab12…90aa', amount: null, qualityScore: null, userId: pv[1]?.id },
        { id: 'pv-08', name: 'InnoVatec Consultores SAC', committed: true, commitmentHash: '0x77fe65dc43ba8901ab23…12cc', amount: null, qualityScore: null, userId: pv[5]?.id },
        { id: 'pv-09', name: 'Suministros Global SAC', committed: true, commitmentHash: '0x9911bb22cc33dd44ee55…dd44', amount: null, qualityScore: null, userId: pv[0]?.id },
      ],
    },

    // ── CLOSED: 2 licitaciones cerradas con resultados ──
    {
      id: 'LIC-2026-005',
      title: 'Adquisición de mobiliario ejecutivo',
      category: 'Mobiliario y equipamiento',
      phase: LicitacionPhase.CLOSED,
      budget: 780_000,
      commitEnd: inDays(-10),
      revealEnd: inDays(-9),
      description: 'Compra de escritorios ejecutivos, sillas ergonómicas y archivadores para 30 puestos de trabajo.',
      organizerId: orgCompras,
      providers: [
        { id: 'pv-10', name: 'Suministros Global SAC', committed: true, commitmentHash: '0xcc11dd22ee33ff44aa55…11bb', amount: 620_000, qualityScore: 94, userId: pv[0]?.id },
        { id: 'pv-11', name: 'Construcciones del Norte SAC', committed: true, commitmentHash: '0xdd22ee33ff44aa55bb66…22cc', amount: 695_000, qualityScore: 87, userId: pv[1]?.id },
        { id: 'pv-12', name: 'InnoVatec Consultores SAC', committed: true, commitmentHash: '0xee33ff44aa55bb66cc77…33dd', amount: 730_000, qualityScore: 81, userId: pv[5]?.id },
      ],
      winnerId: 'pv-10',
      winningAmount: 620_000,
    },
    {
      id: 'LIC-2026-006',
      title: 'Servicio de vigilancia y seguridad 2026',
      category: 'Seguridad física',
      phase: LicitacionPhase.CLOSED,
      budget: 2_400_000,
      commitEnd: inDays(-20),
      revealEnd: inDays(-19),
      description: 'Servicio de vigilancia 24/7 para 4 establecimientos. Incluye casetas, personal certificado y monitoreo por cámaras.',
      organizerId: orgAdmin,
      providers: [
        { id: 'pv-13', name: 'SeguridadCorp SAC', committed: true, commitmentHash: '0xff44aa55bb66cc77dd88…44ee', amount: 1_920_000, qualityScore: 96, userId: pv[3]?.id },
        { id: 'pv-14', name: 'Construcciones del Norte SAC', committed: true, commitmentHash: '0xaa55bb66cc77dd88ee99…55ff', amount: 2_100_000, qualityScore: 89, userId: pv[1]?.id },
        { id: 'pv-15', name: 'LimpiezaPro EIRL', committed: true, commitmentHash: '0xbb66cc77dd88ee99ff00…6611', amount: 2_280_000, qualityScore: 78, userId: pv[2]?.id },
      ],
      winnerId: 'pv-13',
      winningAmount: 1_920_000,
    },

    // ── DRAFT: 1 borrador ──
    {
      id: 'LIC-2026-007',
      title: 'Renovación sala de juntas principal',
      category: 'Obras y remodelación',
      phase: LicitacionPhase.DRAFT,
      budget: 3_500_000,
      commitEnd: inDays(30),
      revealEnd: inDays(31),
      description: 'Renovación integral de la sala de juntas: mobiliario premium, sistema AV 4K, acústica tratada y domótica.',
      organizerId: orgSanPablo,
      providers: [],
    },

    // ── OPEN: 1 licitación adicional ──
    {
      id: 'LIC-2026-008',
      title: 'Provisión de combustible diésel Q3-Q4',
      category: 'Combustibles y lubricantes',
      phase: LicitacionPhase.OPEN,
      budget: 4_200_000,
      commitEnd: inDays(7),
      revealEnd: inDays(8),
      description: 'Abastecimiento de combustible diésel EP para flota vehicular (85 unidades). Entrega en 3 puntos geográficos: Lima, Chiclayo y Cusco.',
      organizerId: orgOSCE,
      providers: [
        { id: 'pv-16', name: 'Construcciones del Norte SAC', committed: true, commitmentHash: '0x1a2b3c4d5e6f78901234…5e6f', amount: null, qualityScore: null, userId: pv[1]?.id },
      ],
    },
  ];

  for (const lic of demoLicitaciones) {
    await prisma.licitacion.upsert({
      where: { id: lic.id },
      update: {
        organizerId: lic.organizerId,
        phase: lic.phase,
        providers: lic.providers as unknown as Prisma.InputJsonValue,
        winnerId: lic.winnerId ?? null,
        winningAmount: lic.winningAmount ?? null,
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
    console.log(`✓ Licitación ${lic.id} → ${lic.phase} · ${lic.title}`);
  }

  console.log('\n📊 Resumen del seed:');
  console.log(`   • ${compradorUsers.length + 1} compradores`);
  console.log(`   • ${proveedorUsers.length} proveedores`);
  console.log(`   • ${demoLicitaciones.length} licitaciones`);
  console.log(`   • ${demoLicitaciones.filter(l => l.phase === 'OPEN').length} abiertas`);
  console.log(`   • ${demoLicitaciones.filter(l => l.phase === 'REVEALING').length} en revelación`);
  console.log(`   • ${demoLicitaciones.filter(l => l.phase === 'CLOSED').length} cerradas`);
  console.log(`   • ${demoLicitaciones.filter(l => l.phase === 'DRAFT').length} borradores`);
  console.log('\nSeeding completo ✅');
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
