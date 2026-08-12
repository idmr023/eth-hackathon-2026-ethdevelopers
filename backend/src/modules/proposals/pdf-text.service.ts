import { Injectable, Logger } from '@nestjs/common';
import { PDFParse } from 'pdf-parse';

// Extrae el texto plano de un buffer PDF usando pdfjs-dist (pdf-parse 2.x).
// Devuelve string vacío si el PDF no contiene texto embebido.
@Injectable()
export class PdfTextService {
  private readonly logger = new Logger(PdfTextService.name);

  async extract(buffer: Buffer): Promise<string> {
    const parser = new PDFParse({ data: buffer });
    try {
      const result = await parser.getText();
      return (result.text ?? '').trim();
    } finally {
      try {
        await parser.destroy();
      } catch {
        // El parser ya liberó sus recursos; no hay nada más que hacer.
      }
    }
  }
}
