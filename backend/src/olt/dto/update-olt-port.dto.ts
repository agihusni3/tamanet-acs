import { IsOptional, IsString, MaxLength } from 'class-validator';

export class UpdateOltPortDto {
  @IsOptional()
  @IsString()
  @MaxLength(50)
  name?: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  description?: string;
}
