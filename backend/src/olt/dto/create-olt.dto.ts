import {
  IsString,
  IsNotEmpty,
  IsIP,
  IsOptional,
  IsInt,
  Min,
  Max,
  IsIn,
  MaxLength,
  IsArray,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

export class PonPortDto {
  @IsOptional()
  @IsInt()
  id?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(64)
  port?: number;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  name?: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  description?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  total?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  online?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  offline?: number;
}

export class CreateOltDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  name: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  vendor: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  model: string;

  @IsIP()
  @IsNotEmpty()
  ip: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(65535)
  webPort?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(65535)
  cliPort?: number;

  @IsOptional()
  @IsIn(['EPON', 'GPON'])
  ponType?: 'EPON' | 'GPON';

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(64)
  ponPortsCount?: number;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  snmpCommunity?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  defaultUser?: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  defaultPass?: string;

  @IsOptional()
  @IsString()
  uptime?: string;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PonPortDto)
  ponPorts?: PonPortDto[];
}
