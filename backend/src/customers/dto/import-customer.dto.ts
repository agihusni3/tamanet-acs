import { IsArray, ArrayMaxSize, ValidateNested, IsOptional } from 'class-validator';
import { Type } from 'class-transformer';
import { CreateCustomerDto } from './create-customer.dto';

export class ImportCustomersDto {
  @IsArray()
  @ArrayMaxSize(1000, { message: 'Maksimal 1.000 record per satu kali batch import' })
  @ValidateNested({ each: true })
  @Type(() => CreateCustomerDto)
  records: CreateCustomerDto[];
}
