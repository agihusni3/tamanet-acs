import {
  IsEnum,
  IsString,
  MaxLength,
  IsInt,
  Min,
  IsOptional,
  IsUUID,
  IsNumber,
  Max,
} from 'class-validator';
import { AssetType } from '../network-asset.entity';

export class UpdateAssetDto {
  @IsEnum(AssetType)
  @IsOptional()
  type?: AssetType;

  @IsString()
  @IsOptional()
  @MaxLength(100)
  name?: string;

  @IsInt()
  @Min(1)
  @IsOptional()
  capacity?: number;

  @IsInt()
  @Min(0)
  @IsOptional()
  used?: number;

  @IsUUID()
  @IsOptional()
  parentId?: string;

  @IsNumber()
  @IsOptional()
  @Min(-90)
  @Max(90)
  lat?: number;

  @IsNumber()
  @IsOptional()
  @Min(-180)
  @Max(180)
  lng?: number;
}
