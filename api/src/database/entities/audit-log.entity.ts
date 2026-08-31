import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { User } from './user.entity';

@Entity('audit_logs')
@Index('idx_audit_logs_user_id', ['user_id'])
@Index('idx_audit_logs_entity', ['entity', 'entity_id'])
export class AuditLog {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid', nullable: true })
  user_id: string | null;

  @ManyToOne(() => User, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'user_id' })
  user: User | null;

  @Column({ type: 'varchar', length: 100 })
  action: string;

  @Column({ type: 'varchar', length: 100 })
  entity: string;

  @Column({ type: 'uuid' })
  entity_id: string;

  @Column({ type: 'jsonb', nullable: true })
  old_value: Record<string, any> | null;

  @Column({ type: 'jsonb', nullable: true })
  new_value: Record<string, any> | null;

  @CreateDateColumn({ type: 'timestamptz' })
  created_at: Date;
}
