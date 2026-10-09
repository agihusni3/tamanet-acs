import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { RolesGuard, Roles } from '../auth/roles.guard';
import { UserRole } from '../users/user.entity';
import { OltsService } from './olts.service';
import { CreateOltDto } from './dto/create-olt.dto';
import { UpdateOltDto } from './dto/update-olt.dto';
import { UpdateOltPortDto } from './dto/update-olt-port.dto';

@Controller('olts')
@UseGuards(AuthGuard('jwt'), RolesGuard)
export class OltsController {
  constructor(private readonly oltsService: OltsService) {}

  @Get()
  async findAll() {
    return this.oltsService.findAll();
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.oltsService.findOne(id);
  }

  @Post()
  @Roles(UserRole.ADMIN, UserRole.NOC)
  async create(@Body() dto: CreateOltDto) {
    return this.oltsService.create(dto);
  }

  @Put(':id')
  @Roles(UserRole.ADMIN, UserRole.NOC)
  async update(@Param('id') id: string, @Body() dto: UpdateOltDto) {
    return this.oltsService.update(id, dto);
  }

  @Put(':id/ports/:port')
  @Roles(UserRole.ADMIN, UserRole.NOC)
  async updatePort(
    @Param('id') id: string,
    @Param('port') port: string,
    @Body() dto: UpdateOltPortDto,
  ) {
    return this.oltsService.updatePort(id, parseInt(port, 10), dto);
  }

  @Delete(':id')
  @Roles(UserRole.ADMIN, UserRole.NOC)
  async remove(@Param('id') id: string) {
    return this.oltsService.remove(id);
  }
}
