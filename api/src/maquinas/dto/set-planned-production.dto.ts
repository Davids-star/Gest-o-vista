import { IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';

/**
 * Define (ou limpa, enviando null) a próxima produção planejada para uma
 * máquina sem sessão ativa — produto e/ou lote que o Totem vai pré-preencher
 * assim que o operador abrir a tela de "Nova produção".
 */
export class SetPlannedProductionDto {
  @IsOptional()
  @IsUUID(undefined, { message: 'product_id deve ser um UUID válido' })
  product_id?: string | null;

  @IsOptional()
  @IsString({ message: 'lot_code deve ser texto' })
  @MaxLength(120, { message: 'lot_code deve ter no máximo 120 caracteres' })
  lot_code?: string | null;
}
