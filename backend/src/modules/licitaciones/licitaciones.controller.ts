import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { AuthUser } from '../../common/decorators/current-user.decorator';
import { Public } from '../../common/decorators/rbac.decorators';
import { CreateLicitacionDto, JoinLicitacionDto } from './dto/licitaciones.dto';
import { LicitacionesService } from './licitaciones.service';

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
  @ApiOperation({ summary: 'Presentar oferta sellada (requiere sesión)' })
  @ApiResponse({ status: 201, description: 'Oferta presentada' })
  async join(@Body() dto: JoinLicitacionDto, @CurrentUser() user: AuthUser) {
    return this.licitaciones.join({
      ...dto,
      userId: user.id,
    });
  }
}
