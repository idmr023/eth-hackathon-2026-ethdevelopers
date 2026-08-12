// Shim mínimo de tipos para `multer` (solo usamos `memoryStorage` en el
// FileInterceptor de NestJS). No se instala @types/multer a propósito.
declare module 'multer' {
  export function memoryStorage(): unknown;
}
