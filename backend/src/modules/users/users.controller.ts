import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { UserRole, UserStatus } from '@prisma/client';
import {
  IsEmail,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';
import { UsersService } from './users.service';
import { Permissions } from '../../common/decorators/rbac.decorators';
import { Permissions as PermissionKeys } from '../../common/permissions';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { AuthUser } from '../../common/decorators/current-user.decorator';
import { QueryFiltersDto } from '../../common/dto/pagination.dto';

class CreateUserDto {
  @IsEmail()
  @IsNotEmpty()
  email!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(160)
  fullName!: string;

  @IsString()
  @MinLength(8)
  @MaxLength(72)
  password!: string;

  @IsOptional()
  @IsEnum(UserRole)
  role?: UserRole;

  @IsOptional()
  @IsString()
  factorId?: string;
}

class UpdateUserStatusDto {
  @IsEnum(UserStatus)
  status!: UserStatus;
}

@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  @Permissions(PermissionKeys.USERS_MANAGE)
  list(@Query() query: QueryFiltersDto) {
    return this.usersService
      .list(query.page, query.limit, query.q)
      .then((r) => ({ data: r.rows, total: r.total }));
  }

  @Post()
  @Permissions(PermissionKeys.USERS_MANAGE)
  create(@Body() dto: CreateUserDto, @CurrentUser() user: AuthUser) {
    return this.usersService.createUser({
      email: dto.email,
      fullName: dto.fullName,
      password: dto.password,
      role: dto.role ?? UserRole.ANALYST,
      factorId: dto.factorId,
      actorUserId: user.id,
    });
  }

  @Patch(':id/status')
  @Permissions(PermissionKeys.USERS_MANAGE)
  updateStatus(
    @Param('id') id: string,
    @Body() dto: UpdateUserStatusDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.usersService.updateStatus(id, dto.status, user.id);
  }
}
