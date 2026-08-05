import { keccak256Hex, computeInvoiceHash } from './invoice-hash';

describe('invoice-hash (protocolo Keccak256)', () => {
  it('produce un hash de 64 caracteres hex prefijado con 0x', () => {
    const hash = computeInvoiceHash({
      rucEmisor: '20123456789',
      rucReceptor: '20512345678',
      numero: 'F001-00000045',
      monto: '48500',
    });
    expect(hash).toMatch(/^0x[0-9a-f]{64}$/);
  });

  it('es determinista: misma entrada, mismo hash', () => {
    const input = {
      rucEmisor: '20123456789',
      rucReceptor: '20512345678',
      numero: 'F001-00000045',
      monto: '48500',
    };
    expect(computeInvoiceHash(input)).toBe(computeInvoiceHash(input));
  });

  it('cambia con cualquiera de los campos canónicos (ruc, número o monto)', () => {
    const base = {
      rucEmisor: '20123456789',
      rucReceptor: '20512345678',
      numero: 'F001-00000045',
      monto: '48500',
    };
    expect(computeInvoiceHash({ ...base, numero: 'F001-00000046' })).not.toBe(
      computeInvoiceHash(base),
    );
    expect(computeInvoiceHash({ ...base, monto: '48501' })).not.toBe(
      computeInvoiceHash(base),
    );
    expect(computeInvoiceHash({ ...base, rucEmisor: '20123456788' })).not.toBe(
      computeInvoiceHash(base),
    );
  });

  it('normaliza espacios en los campos', () => {
    const a = computeInvoiceHash({
      rucEmisor: ' 20123456789 ',
      rucReceptor: '20512345678',
      numero: 'F001-00000045',
      monto: '48500',
    });
    const b = computeInvoiceHash({
      rucEmisor: '20123456789',
      rucReceptor: '20512345678',
      numero: 'F001-00000045',
      monto: '48500',
    });
    expect(a).toBe(b);
  });

  it('keccak256Hex coincide con un vector conocido', () => {
    // keccak256("") = c5d2460186f7233c927e7db2dcc703c0e500b653ca82273b7bfad8045d85a470
    expect(keccak256Hex('')).toBe(
      '0xc5d2460186f7233c927e7db2dcc703c0e500b653ca82273b7bfad8045d85a470',
    );
  });
});
