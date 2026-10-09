import {
  IsNotEmpty,
  IsString,
  MaxLength,
  IsInt,
  Min,
  IsOptional,
  IsUUID,
  IsArray,
} from 'class-validator';

export class CreateCableDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  name: string;

  @IsString()
  @IsOptional()
  @MaxLength(50)
  type?: string;

  @IsInt()
  @Min(1)
  @IsOptional()
  coreCount?: number;

  @IsUUID()
  @IsOptional()
  fromAssetId?: string;

  @IsUUID()
  @IsOptional()
  toAssetId?: string;

  @IsArray()
  @IsOptional()
  coordinates?: [number, number][];

  @IsString()
  @IsOptional()
  notes?: string;
}
