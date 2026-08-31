import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { Company } from './company.entity';

export enum StopPriority {
  BAIXA = 'baixa',
  MEDIA = 'media',
  ALTA = 'alta',
  CRITICA = 'critica',
}

/**
 * O que acontece com a sessão de produção quando essa parada é encerrada:
 * - KEEP_RUNNING: a sessão nunca é tocada (ex.: Pausa) — despausar continua
 *   exatamente a mesma produção, mesmo contador, sem perguntar nada.
 * - ASK_TO_RESUME: pergunta ao operador se quer continuar a mesma produção
 *   (ex.: Limpeza, Falta de material) — motivos onde às vezes dá pra
 *   continuar o que tava rodando, às vezes não.
 * - END_SESSION: comportamento antigo/padrão — a sessão é encerrada assim
 *   que a parada é registrada (ex.: Troca de produto, Fim de turno).
 */
export enum StopSessionAction {
  KEEP_RUNNING = 'keep_running',
  ASK_TO_RESUME = 'ask_to_resume',
  END_SESSION = 'end_session',
}

@Entity('stop_reasons')
@Index('idx_stop_reasons_company_id', ['company_id'])
export class StopReason {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  company_id: string;

  @ManyToOne(() => Company, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'company_id' })
  company: Company;

  @Column({ type: 'varchar', length: 100 })
  code: string;

  @Column({ type: 'varchar', length: 255 })
  label: string;

  @Column({ type: 'varchar', length: 50, default: StopPriority.MEDIA })
  default_priority: StopPriority;

  @Column({ type: 'boolean', default: false })
  planned: boolean;

  @Column({ type: 'varchar', length: 20, default: StopSessionAction.END_SESSION })
  session_action: StopSessionAction;

  @Column({ type: 'boolean', default: true })
  active: boolean;

  @CreateDateColumn({ type: 'timestamptz' })
  created_at: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updated_at: Date;
}
