// Declaración de tipos mínima para `qrcode` (sin @types/qrcode en este entorno).
// Solo se usan las APIs necesarias para renderizar la URI otpauth:// como PNG.
declare module "qrcode" {
  export interface QRCodeToDataURLOptions {
    width?: number;
    margin?: number;
    errorCorrectionLevel?: "L" | "M" | "Q" | "H";
    color?: { dark?: string; light?: string };
  }
  export function toDataURL(
    text: string,
    options?: QRCodeToDataURLOptions,
  ): Promise<string>;
  const QRCode: {
    toDataURL: typeof toDataURL;
  };
  export default QRCode;
}