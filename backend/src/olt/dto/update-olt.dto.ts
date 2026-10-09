import {
  IsString,
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
import { PonPortDto } from './create-olt.dto';

export class UpdateOltDto {
  @IsOptional()
  @IsString()
  @MaxLength(100)
  name?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  vendor?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  model?: string;

  @IsOptional()
  @IsIP()
  ip?: string;

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
