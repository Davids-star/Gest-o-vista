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
import { ProductionSession } from './production-session.entity';

export enum PossibleStopStatus {
  PENDING = 'pending',
  CONFIRMED = 'confirmed',
  DISMISSED = 'dismissed',
}

@Entity('possible_stops')
@Index('idx_possible_stops_machine_id', ['machine_id'])
@Index('idx_possible_stops_status', ['status'])
export class PossibleStop {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  machine_id: string;

  @ManyToOne(() => Machine, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'machine_id' })
  machine: Machine;

  @Column({ type: 'uuid', nullable: true })
  session_id: string | null;

  @ManyToOne(() => ProductionSession, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'session_id' })
  session: ProductionSession | null;

  @Column({ type: 'timestamptz' })
  detected_at: Date;

  @Column({ type: 'int' })
  duration_seconds: number;

  @Column({ type: 'varchar', length: 50, default: PossibleStopStatus.PENDING })
  status: PossibleStopStatus;

  @Column({ type: 'timestamptz', nullable: true })
  resolved_at: Date | null;

  @CreateDateColumn({ type: 'timestamptz' })
  created_at: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updated_at: Date;
}
