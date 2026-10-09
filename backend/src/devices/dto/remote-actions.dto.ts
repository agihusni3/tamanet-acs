import { IsIn, IsOptional, IsString, IsBoolean, MaxLength, MinLength } from 'class-validator';

export class SetWifiDto {
  @IsIn(['2.4', '5'], { message: 'Wi-Fi Band harus berupa "2.4" atau "5"' })
  band: '2.4' | '5';

  @IsOptional()
  @IsString()
  @MaxLength(32, { message: 'SSID maksimal 32 karakter' })
  ssid?: string;

  @IsOptional()
  @IsString()
  @MinLength(8, { message: 'Password Wi-Fi minimal 8 karakter (WPA/WPA2)' })
  @MaxLength(63, { message: 'Password Wi-Fi maksimal 63 karakter' })
  password?: string;

  @IsOptional()
  @IsBoolean()
  enable?: boolean;
}

export class SetPppoeDto {
  @IsOptional()
  @IsString()
  @MaxLength(128, { message: 'Username PPPoE maksimal 128 karakter' })
  username?: string;

  @IsOptional()
  @IsString()
  @MaxLength(128, { message: 'Password PPPoE maksimal 128 karakter' })
  password?: string;
}
