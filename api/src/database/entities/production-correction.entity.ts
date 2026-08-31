import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { ProductionEvent } from './production-event.entity';
import { User } from './user.entity';

@Entity('production_corrections')
@Index('idx_production_corrections_event_id', ['event_id'])
@Index('idx_production_corrections_corrected_by', ['corrected_by'])
export class ProductionCorrection {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  event_id: string;

  @ManyToOne(() => ProductionEvent, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'event_id' })
  event: ProductionEvent;

  @Column({ type: 'int' })
  original_quantity: number;

  @Column({ type: 'int' })
  corrected_quantity: number;

  @Column({ type: 'uuid' })
  corrected_by: string;

  @ManyToOne(() => User, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'corrected_by' })
  supervisor: User;

  @Column({ type: 'text' })
  reason: string;

  @Column({ type: 'timestamptz' })
  corrected_at: Date;

  @CreateDateColumn({ type: 'timestamptz' })
  created_at: Date;
}
