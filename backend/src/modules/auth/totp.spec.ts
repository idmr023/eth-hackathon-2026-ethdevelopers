import {
  generateTotpSecret,
  generateTotp,
  verifyTotp,
  buildOtpAuthUri,
} from './totp';

describe('TOTP (RFC 6238 sin dependencias)', () => {
  it('genera un secreto base32 decodificable y consistente', () => {
    const secret = generateTotpSecret();
    expect(secret.length).toBeGreaterThan(0);
    // El secreto debe poder verificarse contra su propio código.
    const code = generateTotp(secret);
    expect(code).toMatch(/^\d{6}$/);
    expect(verifyTotp(secret, code)).toBe(true);
  });

  it('rechaza códigos con formato inválido', () => {
    const secret = generateTotpSecret();
    expect(verifyTotp(secret, 'abcdef')).toBe(false);
    expect(verifyTotp(secret, '12345')).toBe(false);
    expect(verifyTotp(secret, '')).toBe(false);
  });

  it('acepta códigos dentro de la ventana ±30s', () => {
    const secret = generateTotpSecret();
    const now = Math.floor(Date.now() / 1000);
    const codeNow = generateTotp(secret);
    expect(verifyTotp(secret, codeNow, now)).toBe(true);
    expect(verifyTotp(secret, codeNow, now + 30)).toBe(true);
    expect(verifyTotp(secret, codeNow, now - 30)).toBe(true);
  });

  it('rechaza códigos fuera de la ventana (±60s)', () => {
    const secret = generateTotpSecret();
    const now = Math.floor(Date.now() / 1000);
    const codeNow = generateTotp(secret);
    expect(verifyTotp(secret, codeNow, now + 60)).toBe(false);
    expect(verifyTotp(secret, codeNow, now - 60)).toBe(false);
  });

  it('construye una URI otpauth válida', () => {
    const secret = 'JBSWY3DPEHPK3PXP';
    const uri = buildOtpAuthUri({ secret, accountName: 'usuario@empresa.pe' });
    expect(uri).toContain('otpauth://totp/');
    expect(uri).toContain(`secret=${secret}`);
    expect(uri).toContain('issuer=InvoiceShield');
    expect(uri).toContain('period=30');
    expect(uri).toContain('digits=6');
  });
});
