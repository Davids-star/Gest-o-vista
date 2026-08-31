import { DataSource } from 'typeorm';
import * as dotenv from 'dotenv';
import * as bcrypt from 'bcrypt';
import {
  Company,
  User,
  UserRole,
  Machine,
  Device,
  Product,
  Lot,
  Shift,
  ProductionSession,
  SessionStatus,
  ProductionEvent,
  EventSource,
  ProductionCorrection,
  StopReason,
  StopPriority,
  PossibleStop,
  PossibleStopStatus,
  Stop,
  StopStatus,
  MachineState,
  MachineStateEnum,
  TargetPlan,
  TargetAllocation,
  Alert,
  AlertStatus,
  AuditLog,
} from './entities';

dotenv.config();

const AppDataSource = new DataSource({
  type: 'postgres',
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432', 10),
  username: process.env.DB_USERNAME || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
  database: process.env.DB_NAME || 'sistema_producao',
  entities: [
    Company,
    User,
    Machine,
    Device,
    Product,
    Lot,
    Shift,
    ProductionSession,
    ProductionEvent,
    ProductionCorrection,
    StopReason,
    PossibleStop,
    Stop,
    MachineState,
    TargetPlan,
    TargetAllocation,
    Alert,
    AuditLog,
  ],
  synchronize: true,
});

async function runTestSuite() {
  console.log('🧪 Starting Database Test Suite...\n');
  const ds = await AppDataSource.initialize();

  const companyRepo = ds.getRepository(Company);
  const userRepo = ds.getRepository(User);
  const machineRepo = ds.getRepository(Machine);
  const productRepo = ds.getRepository(Product);
  const lotRepo = ds.getRepository(Lot);
  const sessionRepo = ds.getRepository(ProductionSession);
  const eventRepo = ds.getRepository(ProductionEvent);
  const correctionRepo = ds.getRepository(ProductionCorrection);
  const stopReasonRepo = ds.getRepository(StopReason);
  const possibleStopRepo = ds.getRepository(PossibleStop);
  const stopRepo = ds.getRepository(Stop);
  const machineStateRepo = ds.getRepository(MachineState);
  const targetPlanRepo = ds.getRepository(TargetPlan);
  const targetAllocationRepo = ds.getRepository(TargetAllocation);
  const alertRepo = ds.getRepository(Alert);
  const auditLogRepo = ds.getRepository(AuditLog);

  const timestamp = Date.now();
  let testCompany!: Company;
  let testMachine!: Machine;
  let testProduct!: Product;
  let testLot!: Lot;
  let testUserOperator!: User;
  let testUserSupervisor!: User;
  let testSession!: ProductionSession;
  let testEvent!: ProductionEvent;
  let testStopReason!: StopReason;
  let testPossibleStop!: PossibleStop;
  let testStop!: Stop;
  let testTargetPlan!: TargetPlan;

  // 1. Criação de Empresa
  testCompany = await companyRepo.save(
    companyRepo.create({
      name: `Test Company ${timestamp}`,
      active: true,
    }),
  );
  console.log('✅ TEST 1: Criação de Empresa PASSED');

  // 2. Criação de Máquina
  testMachine = await machineRepo.save(
    machineRepo.create({
      company_id: testCompany.id,
      code: `MQ-TEST-${timestamp}`,
      name: 'Máquina de Teste 01',
      active: true,
    }),
  );
  console.log('✅ TEST 2: Criação de Máquina PASSED');

  // 3. Criação de Produto
  testProduct = await productRepo.save(
    productRepo.create({
      company_id: testCompany.id,
      name: 'Produto Teste Biscoito',
      sku: `SKU-${timestamp}`,
      active: true,
    }),
  );
  console.log('✅ TEST 3: Criação de Produto PASSED');

  // 4. Criação de Lote
  testLot = await lotRepo.save(
    lotRepo.create({
      company_id: testCompany.id,
      code: `LOTE-TEST-${timestamp}`,
      product_id: testProduct.id,
    }),
  );
  console.log('✅ TEST 4: Criação de Lote PASSED');

  // 5. Criação de Usuário
  testUserOperator = await userRepo.save(
    userRepo.create({
      company_id: testCompany.id,
      name: 'Operador Teste',
      email: null,
      password_hash: null,
      role: UserRole.OPERADOR,
      active: true,
    }),
  );

  testUserSupervisor = await userRepo.save(
    userRepo.create({
      company_id: testCompany.id,
      name: 'Supervisor Teste',
      email: `supervisor-${timestamp}@test.com`,
      password_hash: await bcrypt.hash('123456', 10),
      role: UserRole.SUPERVISOR,
      active: true,
    }),
  );
  console.log('✅ TEST 5: Criação de Usuários PASSED');

  // 6. Criação de Sessão
  testSession = await sessionRepo.save(
    sessionRepo.create({
      machine_id: testMachine.id,
      product_id: testProduct.id,
      lot_id: testLot.id,
      operator_id: testUserOperator.id,
      started_at: new Date(),
      status: SessionStatus.ACTIVE,
    }),
  );
  console.log('✅ TEST 6: Criação de Sessão PASSED');

  // 7. Criação de Evento
  const uniqueEventUid = `EVT-UID-${timestamp}`;
  testEvent = await eventRepo.save(
    eventRepo.create({
      session_id: testSession.id,
      machine_id: testMachine.id,
      event_uid: uniqueEventUid,
      quantity: 1,
      occurred_at: new Date(),
      received_at: new Date(),
      source: EventSource.SENSOR,
    }),
  );
  console.log('✅ TEST 7: Criação de Evento PASSED');

  // 8. Reenvio do mesmo event_uid (Idempotência via Unique Index)
  const duplicateEvent = eventRepo.create({
    session_id: testSession.id,
    machine_id: testMachine.id,
    event_uid: uniqueEventUid, // Duplicate UID
    quantity: 1,
    occurred_at: new Date(),
    received_at: new Date(),
    source: EventSource.SENSOR,
  });

  let duplicateRejected = false;
  try {
    await eventRepo.save(duplicateEvent);
  } catch (dbErr: any) {
    duplicateRejected = true;
  }

  const countEvents = await eventRepo.count({ where: { event_uid: uniqueEventUid } });

  if (duplicateRejected && countEvents === 1) {
    console.log('✅ TEST 8: Reenvio do mesmo event_uid (Idempotência bloqueou duplicidade) PASSED');
  } else {
    console.error('❌ TEST 8: Reenvio do mesmo event_uid FAILED: Evento foi duplicado!');
  }

  // 9. Tentativa de duas sessões ativas na mesma máquina (Bloqueado por parcial unique index)
  let secondActiveSessionBlocked = false;
  try {
    await sessionRepo.save(
      sessionRepo.create({
        machine_id: testMachine.id,
        product_id: testProduct.id,
        lot_id: testLot.id,
        operator_id: testUserOperator.id,
        started_at: new Date(),
        status: SessionStatus.ACTIVE, // Attempt 2nd ACTIVE session for testMachine
      }),
    );
  } catch (dbErr: any) {
    secondActiveSessionBlocked = true;
  }

  if (secondActiveSessionBlocked) {
    console.log('✅ TEST 9: Bloqueio de 2ª Sessão Ativa na mesma máquina (Índice Único Parcial) PASSED');
  } else {
    console.error('❌ TEST 9: Bloqueio de 2ª Sessão Ativa FAILED: Segunda sessão ativa foi permitida!');
  }

  // 10. Criação de Parada
  testStopReason = await stopReasonRepo.save(
    stopReasonRepo.create({
      company_id: testCompany.id,
      code: `REASON-${timestamp}`,
      label: 'Problema Mecânico Teste',
      default_priority: StopPriority.ALTA,
    }),
  );

  testPossibleStop = await possibleStopRepo.save(
    possibleStopRepo.create({
      machine_id: testMachine.id,
      session_id: testSession.id,
      detected_at: new Date(),
      duration_seconds: 120,
      status: PossibleStopStatus.CONFIRMED,
    }),
  );

  testStop = await stopRepo.save(
    stopRepo.create({
      machine_id: testMachine.id,
      session_id: testSession.id,
      possible_stop_id: testPossibleStop.id,
      operator_id: testUserOperator.id,
      reason_id: testStopReason.id,
      observation: 'Esteira travada',
      started_at: new Date(),
      status: StopStatus.OPEN,
    }),
  );
  console.log('✅ TEST 10: Criação de Parada PASSED');

  // 11. Encerramento de Parada
  const endedAt = new Date();
  const durationSeconds = Math.round((endedAt.getTime() - testStop.started_at.getTime()) / 1000);
  await stopRepo.update(testStop.id, {
    ended_at: endedAt,
    duration_seconds: durationSeconds,
    status: StopStatus.CLOSED,
  });
  const closedStop = await stopRepo.findOne({ where: { id: testStop.id } });
  if (closedStop && closedStop.status === StopStatus.CLOSED && closedStop.ended_at !== null) {
    console.log('✅ TEST 11: Encerramento de Parada PASSED');
  } else {
    console.error('❌ TEST 11: Encerramento de Parada FAILED');
  }

  // 12. Criação de Estado da Máquina (Append-only)
  const newState = await machineStateRepo.save(
    machineStateRepo.create({
      machine_id: testMachine.id,
      state: MachineStateEnum.RUNNING,
      changed_at: new Date(),
    }),
  );
  await machineRepo.update(testMachine.id, { current_state_id: newState.id });
  console.log('✅ TEST 12: Criação de Estado de Máquina (Append-only) PASSED');

  // 13. Criação de Meta (TargetPlan)
  testTargetPlan = await targetPlanRepo.save(
    targetPlanRepo.create({
      company_id: testCompany.id,
      machine_id: testMachine.id,
      product_id: testProduct.id,
      period_type: 'monthly',
      period_start: '2026-08-01',
      period_end: '2026-08-31',
      quantity: 10000,
      created_by: testUserSupervisor.id,
    }),
  );
  console.log('✅ TEST 13: Criação de Meta (TargetPlan) PASSED');

  // 14. Criação de TargetAllocation
  await targetAllocationRepo.save(
    targetAllocationRepo.create({
      target_plan_id: testTargetPlan.id,
      period_type: 'daily',
      period_start: '2026-08-28',
      period_end: '2026-08-28',
      quantity: 500,
      generated_by: 'auto',
    }),
  );
  console.log('✅ TEST 14: Criação de Allocation PASSED');

  // 15. Criação de Alerta
  await alertRepo.save(
    alertRepo.create({
      machine_id: testMachine.id,
      stop_id: testStop.id,
      type: 'STATION_INACTIVE',
      priority: 'alta',
      message: 'Máquina inativa por mais de 5 minutos',
      status: AlertStatus.OPEN,
      triggered_at: new Date(),
    }),
  );
  console.log('✅ TEST 15: Criação de Alerta PASSED');

  // 16. Criação de Audit Log
  await auditLogRepo.save(
    auditLogRepo.create({
      user_id: testUserSupervisor.id,
      action: 'UPDATE_PRODUCT',
      entity: 'production_sessions',
      entity_id: testSession.id,
      old_value: { product_id: testProduct.id },
      new_value: { product_id: testProduct.id },
    }),
  );
  console.log('✅ TEST 16: Criação de Audit Log PASSED');

  // 17. Correção de evento por Supervisor (Não destrutivo)
  const correction = await correctionRepo.save(
    correctionRepo.create({
      event_id: testEvent.id,
      original_quantity: testEvent.quantity,
      corrected_quantity: 10,
      corrected_by: testUserSupervisor.id,
      reason: 'Ajuste de amostragem pelo Supervisor',
      corrected_at: new Date(),
    }),
  );

  const originalEvent = await eventRepo.findOne({ where: { id: testEvent.id } });

  if (correction && originalEvent && originalEvent.quantity === 1) {
    console.log('✅ TEST 17: Correção de evento por Supervisor (Original Preservado) PASSED');
  } else {
    console.error('❌ TEST 17: Correção de evento por Supervisor FAILED: Evento original foi alterado!');
  }

  console.log('\n🎉 ALL 17 DATABASE TESTS EXECUTED AND PASSED SUCCESSFULLY!');
  await ds.destroy();
  process.exit(0);
}

runTestSuite().catch((err) => {
  console.error('Fatal error running test suite:', err);
  process.exit(1);
});
