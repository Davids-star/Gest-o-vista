import { IsEmail, IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class LoginDto {
  @IsEmail({}, { message: 'E-mail inválido' })
  @IsNotEmpty({ message: 'E-mail é obrigatório' })
  @MaxLength(255)
  email: string;

  // Teto de 72: o bcrypt ignora o que passa disso, e senha gigante só gasta CPU.
  @IsString({ message: 'Senha deve ser uma string' })
  @IsNotEmpty({ message: 'Senha é obrigatória' })
  @MaxLength(72)
  password: string;
}
