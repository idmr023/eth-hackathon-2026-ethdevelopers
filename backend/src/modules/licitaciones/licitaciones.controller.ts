import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Res,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import type { Response } from 'express';
import { memoryStorage } from 'multer';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { AuthUser } from '../../common/decorators/current-user.decorator';
import { Public } from '../../common/decorators/rbac.decorators';
import type { ProposalFileInput } from './licitaciones.service';
import {
  CreateLicitacionDto,
  JoinLicitacionDto,
  RevealLicitacionDto,
} from './dto/licitaciones.dto';
import { LicitacionesService } from './licitaciones.service';

const PROPOSAL_LIMIT = 10 * 1024 * 1024; // 10 MB

// Forma del archivo subido por multer (memoryStorage). No depende de
// @types/multer para no inflar dependencias.
interface MulterFile {
  buffer: Buffer;
  mimetype: string;
  originalname: string;
  size: number;
}

@ApiTags('licitaciones')
@Controller('licitaciones')
export class LicitacionesController {
  constructor(private readonly licitaciones: LicitacionesService) {}

  @Public()
  @Get()
  @ApiOperation({ summary: 'Listar licitaciones demo y creadas' })
  @ApiResponse({ status: 200, description: 'Lista de licitaciones' })
  async list() {
    return this.licitaciones.list();
  }

  @Public()
  @Get(':id')
  @ApiOperation({ summary: 'Detalle de una licitación' })
  @ApiResponse({ status: 200, description: 'Detalle de licitación' })
  @ApiResponse({ status: 404, description: 'Licitación no encontrada' })
  async get(@Param('id') id: string) {
    return this.licitaciones.getById(id);
  }

  @Post()
  @ApiOperation({ summary: 'Crear licitación (requiere sesión)' })
  @ApiResponse({ status: 201, description: 'Licitación creada' })
  async create(
    @Body() dto: CreateLicitacionDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.licitaciones.create({
      ...dto,
      organizerId: user.id,
    });
  }

  @Post('join')
  @UseInterceptors(
    FileInterceptor('proposal', {
      storage: memoryStorage(),
      limits: { fileSize: PROPOSAL_LIMIT },
    }),
  )
  @ApiOperation({
    summary:
      'Presentar oferta sellada con propuesta PDF obligatoria (requiere sesión)',
  })
  @ApiResponse({ status: 201, description: 'Oferta presentada' })
  async join(
    @Body() dto: JoinLicitacionDto,
    @UploadedFile() file: MulterFile | undefined,
    @CurrentUser() user: AuthUser,
  ) {
    let proposal: ProposalFileInput | null = null;
    if (file) {
      proposal = {
        buffer: file.buffer,
        mimetype: file.mimetype,
        originalName: file.originalname,
        size: file.size,
      };
    }
    return this.licitaciones.join({
      ...dto,
      userId: user.id,
      proposal,
    });
  }

  @Post(':id/reveal')
  @ApiOperation({ summary: 'Revelar oferta (requiere sesión)' })
  @ApiResponse({ status: 200, description: 'Oferta revelada' })
  async reveal(
    @Param('id') id: string,
    @Body() dto: RevealLicitacionDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.licitaciones.reveal({
      licitacionId: id,
      amount: dto.amount,
      userId: user.id,
    });
  }

  @Post(':id/evaluate')
  @ApiOperation({
    summary: 'Disparar evaluación IA de propuestas (requiere sesión)',
  })
  @ApiResponse({ status: 200, description: 'Evaluación IA ejecutada' })
  async evaluate(@Param('id') id: string) {
    return this.licitaciones.evaluateNow(id);
  }

  @Get(':id/providers/:providerId/proposal')
  @ApiOperation({ summary: 'Descargar propuesta PDF de un proveedor' })
  @ApiResponse({ status: 200, description: 'Archivo PDF' })
  async downloadProposal(
    @Param('id') id: string,
    @Param('providerId') providerId: string,
    @CurrentUser() user: AuthUser,
    @Res({ passthrough: true }) res: Response,
  ) {
    const { buffer, contentType, fileName } =
      await this.licitaciones.downloadProposal(id, providerId, user.id);
    res.setHeader('Content-Type', contentType);
    res.setHeader(
      'Content-Disposition',
      `inline; filename="${fileName.replace(/["\\]/g, '')}"`,
    );
    res.send(buffer);
  }
}
