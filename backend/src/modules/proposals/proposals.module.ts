import { Module } from '@nestjs/common';
import { AiEvaluationService } from './ai-evaluation.service';
import { PdfTextService } from './pdf-text.service';
import { ProposalStorageService } from './proposal-storage.service';

// Servicios de propuestas PDF: almacenamiento en BD (BYTEA), extracción de
// texto y evaluación IA (OpenRouter + fallback heurístico).
@Module({
  providers: [PdfTextService, ProposalStorageService, AiEvaluationService],
  exports: [PdfTextService, ProposalStorageService, AiEvaluationService],
})
export class ProposalsModule {}
