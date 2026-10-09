import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { RolesGuard, Roles } from '../auth/roles.guard';
import { UserRole } from '../users/user.entity';
import { CustomersService } from './customers.service';
import { CreateCustomerDto } from './dto/create-customer.dto';
import { UpdateCustomerDto } from './dto/update-customer.dto';
import { ImportCustomersDto } from './dto/import-customer.dto';

@Controller('customers')
@UseGuards(AuthGuard('jwt'), RolesGuard)
export class CustomersController {
  constructor(private readonly customersService: CustomersService) {}

  @Get()
  async findAll(@Query('page') page?: number, @Query('limit') limit?: number) {
    return this.customersService.findAll(page, limit);
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.customersService.findOne(id);
  }

  @Post()
  @Roles(UserRole.ADMIN, UserRole.NOC, UserRole.TEKNISI)
  async create(@Body() data: CreateCustomerDto) {
    return this.customersService.create(data);
  }

  @Put(':id')
  @Roles(UserRole.ADMIN, UserRole.NOC, UserRole.TEKNISI)
  async update(@Param('id') id: string, @Body() data: UpdateCustomerDto) {
    return this.customersService.update(id, data);
  }

  @Delete(':id')
  @Roles(UserRole.ADMIN, UserRole.NOC)
  async remove(@Param('id') id: string) {
    return this.customersService.remove(id);
  }

  @Post('import')
  @Roles(UserRole.ADMIN, UserRole.NOC)
  async importBulk(@Body() dto: ImportCustomersDto) {
    return this.customersService.importBulk(dto.records || []);
  }
}
