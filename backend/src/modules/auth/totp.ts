import { createHmac, randomBytes, timingSafeEqual } from 'node:crypto';

// TOTP (RFC 6238) y HOTP (RFC 4226) implementados sobre node:crypto.
// Sin dependencias externas (otplib no se pudo instalar en este entorno).

const BASE32_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
const STEP_SECONDS = 30;
const DIGITS = 6;
const WINDOW = 1; // ±1 paso (±30s) de tolerancia.

/** Genera un secreto TOTP aleatorio de 20 bytes codificado en base32 (RFC 6238). */
export function generateTotpSecret(): string {
  return base32Encode(randomBytes(20));
}

function base32Encode(buffer: Buffer): string {
  let bits = 0;
  let value = 0;
  let output = '';
  for (const byte of buffer) {
    value = (value << 8) | byte;
    bits += 8;
    while (bits >= 5) {
      output += BASE32_ALPHABET[(value >>> (bits - 5)) & 31];
      bits -= 5;
    }
  }
  if (bits > 0) {
    output += BASE32_ALPHABET[(value << (5 - bits)) & 31];
  }
  return output;
}

/** Decodifica una cadena base32 a Buffer (tolera padding y minúsculas). */
function base32Decode(input: string): Buffer {
  const clean = input.replace(/=+$/, '').toUpperCase();
  let bits = 0;
  let value = 0;
  const bytes: number[] = [];
  for (const char of clean) {
    const idx = BASE32_ALPHABET.indexOf(char);
    if (idx === -1) continue;
    value = (value << 5) | idx;
    bits += 5;
    if (bits >= 8) {
      bytes.push((value >>> (bits - 8)) & 0xff);
      bits -= 8;
    }
  }
  return Buffer.from(bytes);
}

function hotp(secret: Buffer, counter: bigint): number {
  const counterBuffer = Buffer.alloc(8);
  counterBuffer.writeBigUInt64BE(counter);
  const hmac = createHmac('sha1', secret).update(counterBuffer).digest();
  const offset = hmac[hmac.length - 1] & 0x0f;
  const truncated =
    ((hmac[offset] & 0x7f) << 24) |
    ((hmac[offset + 1] & 0xff) << 16) |
    ((hmac[offset + 2] & 0xff) << 8) |
    (hmac[offset + 3] & 0xff);
  return truncated % 10 ** DIGITS;
}

/** Genera el código TOTP actual (6 dígitos) para un secreto base32. */
export function generateTotp(secretBase32: string): string {
  const counter = BigInt(Math.floor(Date.now() / 1000 / STEP_SECONDS));
  const secret = base32Decode(secretBase32);
  return hotp(secret, counter).toString().padStart(DIGITS, '0');
}

/**
 * Verifica un código TOTP contra el secreto, permitiendo ±1 paso (±30s).
 * Usa comparación de tiempo constante para evitar timing leaks.
 */
export function verifyTotp(
  secretBase32: string,
  code: string,
  nowSeconds = Math.floor(Date.now() / 1000),
): boolean {
  if (!/^\d{6}$/.test(code)) return false;
  const secret = base32Decode(secretBase32);
  const currentCounter = BigInt(Math.floor(nowSeconds / STEP_SECONDS));
  for (let drift = -WINDOW; drift <= WINDOW; drift++) {
    const candidate = hotp(secret, currentCounter + BigInt(drift));
    const candidateStr = candidate.toString().padStart(DIGITS, '0');
    const a = Buffer.from(candidateStr);
    const b = Buffer.from(code);
    if (a.length === b.length && timingSafeEqual(a, b)) return true;
  }
  return false;
}

/**
 * Construye la URI otpauth:// (RFC 6288) para apps de Authenticator y para
 * renderizar el QR en el frontend.
 */
export function buildOtpAuthUri(opts: {
  secret: string;
  accountName: string;
  issuer?: string;
}): string {
  const issuer = opts.issuer ?? 'InvoiceShield';
  const label = encodeURIComponent(`${issuer}:${opts.accountName}`);
  const params = new URLSearchParams({
    secret: opts.secret,
    issuer,
    algorithm: 'SHA1',
    digits: String(DIGITS),
    period: String(STEP_SECONDS),
  });
  return `otpauth://totp/${label}?${params.toString()}`;
}
