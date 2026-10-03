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
import { Product } from './product.entity';

@Entity('machines')
@Index('idx_machines_company_code', ['company_id', 'code'], { unique: true })
export class Machine {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  company_id: string;

  @ManyToOne(() => Company, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'company_id' })
  company: Company;

  @Column({ type: 'varchar', length: 50 })
  code: string;

  @Column({ type: 'varchar', length: 255 })
  name: string;

  @Column({ type: 'uuid', nullable: true })
  current_state_id: string | null;

  @Column({ type: 'boolean', default: true })
  active: boolean;

  /**
   * Origem do sensor desta máquina: 'cable' (PC + serve.py/MQTT) ou 'bluetooth'
   * (tablet do Totem + HC-06). Uma máquina recebe contagem de UMA origem só —
   * eventos da outra são recusados, para não contar cada peça duas vezes.
   * null = ainda não configurada (aceita qualquer origem).
   */
  @Column({ type: 'varchar', length: 20, nullable: true })
  sensor_source: string | null;

  /**
   * Próxima produção planejada para esta máquina — definida pelo supervisor
   * enquanto a máquina está SEM sessão ativa (aguardando). Fica valendo até
   * alguém trocar (não é consumida ao iniciar sessão). O Totem lê esses dois
   * campos pra pré-preencher produto e lote na tela de "Nova produção".
   */
  @Column({ type: 'uuid', nullable: true })
  planned_product_id: string | null;

  @ManyToOne(() => Product, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'planned_product_id' })
  planned_product: Product | null;

  @Column({ type: 'varchar', length: 120, nullable: true })
  planned_lot_code: string | null;

  @CreateDateColumn({ type: 'timestamptz' })
  created_at: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updated_at: Date;
}
