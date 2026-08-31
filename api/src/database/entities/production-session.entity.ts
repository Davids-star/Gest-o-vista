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
import { Machine } from './machine.entity';
import { Product } from './product.entity';
import { Lot } from './lot.entity';
import { Shift } from './shift.entity';
import { User } from './user.entity';

export enum SessionStatus {
  ACTIVE = 'active',
  CLOSED = 'closed',
}

@Entity('production_sessions')
@Index('idx_production_sessions_machine_id', ['machine_id'])
@Index('idx_production_sessions_status', ['status'])
@Index('idx_production_sessions_started_at', ['started_at'])
@Index('idx_unique_active_session_per_machine', ['machine_id'], {
  unique: true,
  where: "status = 'active'",
})
export class ProductionSession {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  machine_id: string;

  @ManyToOne(() => Machine, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'machine_id' })
  machine: Machine;

  @Column({ type: 'uuid' })
  product_id: string;

  @ManyToOne(() => Product, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'product_id' })
  product: Product;

  @Column({ type: 'uuid' })
  lot_id: string;

  @ManyToOne(() => Lot, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'lot_id' })
  lot: Lot;

  @Column({ type: 'uuid', nullable: true })
  shift_id: string | null;

  @ManyToOne(() => Shift, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'shift_id' })
  shift: Shift | null;

  @Column({ type: 'uuid' })
  operator_id: string;

  @ManyToOne(() => User, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'operator_id' })
  operator: User;

  @Column({ type: 'timestamptz' })
  started_at: Date;

  @Column({ type: 'timestamptz', nullable: true })
  ended_at: Date | null;

  @Column({ type: 'varchar', length: 50, default: SessionStatus.ACTIVE })
  status: SessionStatus;

  @CreateDateColumn({ type: 'timestamptz' })
  created_at: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updated_at: Date;
}
