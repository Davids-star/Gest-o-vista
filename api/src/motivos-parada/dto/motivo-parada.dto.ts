import { IsBoolean, IsEnum, IsNotEmpty, IsOptional, IsString, Matches, MaxLength } from 'class-validator';
import { StopPriority, StopSessionAction } from '../../database/entities/stop-reason.entity';

export class CreateMotivoParadaDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  @Matches(/^[A-Za-z0-9_-]+$/, { message: 'code aceita só letras, números, "_" e "-"' })
  code: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  label: string;

  @IsOptional()
  @IsEnum(StopPriority)
  default_priority?: StopPriority;

  @IsOptional()
  @IsBoolean()
  planned?: boolean;

  @IsOptional()
  @IsEnum(StopSessionAction)
  session_action?: StopSessionAction;

  @IsOptional()
  @IsBoolean()
  active?: boolean;
}

export class UpdateMotivoParadaDto {
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  label?: string;

  @IsOptional()
  @IsEnum(StopPriority)
  default_priority?: StopPriority;

  @IsOptional()
  @IsBoolean()
  planned?: boolean;

  @IsOptional()
  @IsEnum(StopSessionAction)
  session_action?: StopSessionAction;

  @IsOptional()
  @IsBoolean()
  active?: boolean;
}
