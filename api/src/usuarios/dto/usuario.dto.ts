import { IsBoolean, IsEmail, IsEnum, IsNotEmpty, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';
import { UserRole } from '../../database/entities/user.entity';

const PAPEIS = [UserRole.OPERADOR, UserRole.SUPERVISOR, UserRole.ADMINISTRADOR];

export class CreateUsuarioDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  nome: string;

  @IsEmail()
  @MaxLength(255)
  email: string;

  // 8 mínimo (igual ao scripts/criar-usuario.js); 72 máximo é o limite real do bcrypt.
  @IsString()
  @MinLength(8, { message: 'A senha precisa de pelo menos 8 caracteres' })
  @MaxLength(72)
  senha: string;

  @IsEnum(PAPEIS, { message: 'role deve ser operador, supervisor ou administrador' })
  role: UserRole;
}

export class UpdateUsuarioDto {
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  name?: string;

  @IsOptional()
  @IsEmail()
  @MaxLength(255)
  email?: string;

  @IsOptional()
  @IsString()
  @MinLength(8, { message: 'A senha precisa de pelo menos 8 caracteres' })
  @MaxLength(72)
  senha?: string;

  @IsOptional()
  @IsEnum(PAPEIS)
  role?: UserRole;

  @IsOptional()
  @IsBoolean()
  active?: boolean;
}
