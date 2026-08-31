import { IsString, IsOptional, IsObject, IsBoolean } from 'class-validator';

export class UpdateDeviceDto {
  @IsString()
  @IsOptional()
  type?: string;

  @IsObject()
  @IsOptional()
  config?: Record<string, any>;

  @IsBoolean()
  @IsOptional()
  active?: boolean;
}
