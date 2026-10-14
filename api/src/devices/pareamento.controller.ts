import { Body, Controller, Post } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { Public } from '../common/decorators/public.decorator';
import { DevicesService } from './devices.service';
import { CodigoPareamentoDto, ParearAparelhoDto } from './dto/pareamento.dto';

/**
 * Ativação de aparelho novo (celular/tablet que baixou o app) com o CÓDIGO DE PAREAMENTO
 * definido no servidor (variável CODIGO_PAREAMENTO). Rotas públicas, mas só funcionam com o
 * código certo e têm limite de tentativas (10 por minuto por IP) contra adivinhação.
 */
@Controller('pareamento')
export class PareamentoController {
  constructor(private readonly devicesService: DevicesService) {}

  /** 1) Confere o código e devolve as máquinas (sensores) para o usuário escolher. */
  @Public()
  @Throttle({ global: { limit: 10, ttl: 60_000 } })
  @Post('maquinas')
  maquinas(@Body() dto: CodigoPareamentoDto) {
    return this.devicesService.maquinasParaPareamento(dto.codigo);
  }

  /** 2) Cria o aparelho ligado à máquina escolhida e devolve a credencial (aparece só uma vez). */
  @Public()
  @Throttle({ global: { limit: 10, ttl: 60_000 } })
  @Post()
  parear(@Body() dto: ParearAparelhoDto) {
    return this.devicesService.parearAparelho(dto.codigo, dto.machine_id, dto.nome);
  }
}
