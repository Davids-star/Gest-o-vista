import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { Machine } from './machine.entity';

export enum MachineStateEnum {
  IDLE = 'IDLE',
  RUNNING = 'RUNNING',
  STOPPED = 'STOPPED',
  MAINTENANCE = 'MAINTENANCE',
  OFFLINE = 'OFFLINE',
}

@Entity('machine_states')
@Index('idx_machine_states_machine_id', ['machine_id'])
@Index('idx_machine_states_changed_at', ['changed_at'])
export class MachineState {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  machine_id: string;

  @ManyToOne(() => Machine, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'machine_id' })
  machine: Machine;

  @Column({ type: 'varchar', length: 50 })
  state: MachineStateEnum;

  @Column({ type: 'timestamptz' })
  changed_at: Date;

  @CreateDateColumn({ type: 'timestamptz' })
  created_at: Date;
}
