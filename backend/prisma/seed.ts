import 'dotenv/config';
import { AnomalyType, InvoiceStatus, PrismaClient, UserRole, ValidationType } from '@prisma/client';
import { hash } from 'bcryptjs';
import { computeInvoiceHash } from '../src/shared/invoice-hash';

const prisma = new PrismaClient();
const PASSWORD_HASH_ROUNDS = 10;

async function main(): Promise<void> {
  console.log('🌱 Seeding InvoiceShield...');

  // ── Admin ───────────────────────────────────────────────────────────
  const adminEmail = process.env.SEED_ADMIN_EMAIL ?? 'admin@invoiceshield.dev';
  const adminPassword = process.env.SEED_ADMIN_PASSWORD ?? 'ChangeMe123!';
  await prisma.user.upsert({
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
