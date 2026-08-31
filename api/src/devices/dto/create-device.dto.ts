import { IsString, IsNotEmpty, IsOptional, IsObject } from 'class-validator';

export class CreateDeviceDto {
  @IsString()
  @IsNotEmpty()
  machine_id: string;

  @IsString()
  @IsNotEmpty()
  type: string;

  @IsString()
  @IsNotEmpty()
  identifier: string;

  @IsObject()
  @IsOptional()
  config?: Record<string, any>;
}
