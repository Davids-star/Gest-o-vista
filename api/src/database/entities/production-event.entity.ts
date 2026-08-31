import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { ProductionSession } from './production-session.entity';
import { Machine } from './machine.entity';

export enum EventSource {
  SENSOR = 'sensor',
  SIMULATOR = 'simulator',
  MANUAL = 'manual',
}

@Entity('production_events')
@Index('idx_production_events_machine_id', ['machine_id'])
@Index('idx_production_events_session_id', ['session_id'])
@Index('idx_production_events_occurred_at', ['occurred_at'])
@Index('idx_production_events_event_uid', ['event_uid'], { unique: true })
export class ProductionEvent {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  session_id: string;

  @ManyToOne(() => ProductionSession, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'session_id' })
  session: ProductionSession;

  @Column({ type: 'uuid' })
  machine_id: string;

  @ManyToOne(() => Machine, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'machine_id' })
  machine: Machine;

  @Column({ type: 'varchar', length: 255, unique: true })
  event_uid: string;

  @Column({ type: 'int' })
  quantity: number;

  @Column({ type: 'timestamptz' })
  occurred_at: Date;

  @Column({ type: 'timestamptz' })
  received_at: Date;

  @Column({ type: 'varchar', length: 50 })
  source: EventSource;

  @CreateDateColumn({ type: 'timestamptz' })
  created_at: Date;
}
