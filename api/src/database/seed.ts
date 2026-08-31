import { DataSource } from 'typeorm';
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
  StopReason,
  StopPriority,
  TargetPlan,
  TargetAllocation,
} from './entities';

export async function runSeed(dataSource: DataSource) {
  console.log('🌱 Starting Database Seed...');

  const companyRepo = dataSource.getRepository(Company);
  const userRepo = dataSource.getRepository(User);
  const machineRepo = dataSource.getRepository(Machine);
  const deviceRepo = dataSource.getRepository(Device);
  const productRepo = dataSource.getRepository(Product);
  const lotRepo = dataSource.getRepository(Lot);
  const shiftRepo = dataSource.getRepository(Shift);
  const stopReasonRepo = dataSource.getRepository(StopReason);
  const targetPlanRepo = dataSource.getRepository(TargetPlan);
  const targetAllocationRepo = dataSource.getRepository(TargetAllocation);

  // 1. Empresa
  let company = await companyRepo.findOne({ where: { name: 'Fábrica de Biscoitos Freitas' } });
  if (!company) {
    company = await companyRepo.save(
      companyRepo.create({
        name: 'Fábrica de Biscoitos Freitas',
        active: true,
      }),
    );
    console.log(`✅ Company created: ${company.name} (${company.id})`);
  }

  // 2. Usuários (Operador, Supervisor, Administrador)
  const defaultPasswordHash = await bcrypt.hash('123456', 10);

  // Remove custom users if created in previous attempt
  await userRepo.delete({ email: 'fepdavangelo12@gmail.com' });
  await userRepo.delete({ email: 'davidsfelipe10@gmail.com' });

  let operador = await userRepo.findOne({ where: { company_id: company.id, name: 'Carlos Operador' } });
  if (!operador) {
    operador = await userRepo.save(
      userRepo.create({
        company_id: company.id,
        name: 'Carlos Operador',
        email: null,
        password_hash: null,
        role: UserRole.OPERADOR,
        active: true,
      }),
    );
    console.log(`✅ User (operador) created: ${operador.name}`);
  }

  let supervisor = await userRepo.findOne({ where: { email: 'supervisor@fabrica.com' } });
  if (!supervisor) {
    supervisor = await userRepo.save(
      userRepo.create({
        company_id: company.id,
        name: 'Ana Supervisora',
        email: 'supervisor@fabrica.com',
        password_hash: defaultPasswordHash,
        role: UserRole.SUPERVISOR,
        active: true,
      }),
    );
    console.log(`✅ User (supervisor) created: ${supervisor.name}`);
  } else {
    supervisor.password_hash = defaultPasswordHash;
    supervisor.role = UserRole.SUPERVISOR;
    supervisor.active = true;
    await userRepo.save(supervisor);
    console.log(`✅ User (supervisor) restored: ${supervisor.email}`);
  }

  let admin = await userRepo.findOne({ where: { email: 'admin@fabrica.com' } });
  if (!admin) {
    admin = await userRepo.save(
      userRepo.create({
        company_id: company.id,
        name: 'Admin Sistema',
        email: 'admin@fabrica.com',
        password_hash: defaultPasswordHash,
        role: UserRole.ADMINISTRADOR,
        active: true,
      }),
    );
    console.log(`✅ User (administrador) created: ${admin.email}`);
  } else {
    admin.password_hash = defaultPasswordHash;
    admin.role = UserRole.ADMINISTRADOR;
    admin.active = true;
    await userRepo.save(admin);
    console.log(`✅ User (administrador) restored: ${admin.email}`);
  }

  // 3. Máquinas (Máquina 1, Máquina 2, Máquina 3, Máquina 4)
  const machinesData = [
    { code: '1', name: 'Máquina 1' },
    { code: '2', name: 'Máquina 2' },
    { code: '3', name: 'Máquina 3' },
    { code: '4', name: 'Máquina 4' },
  ];

  for (const mData of machinesData) {
    let m = await machineRepo.findOne({ where: { company_id: company.id, code: mData.code } });
    if (!m) {
      m = await machineRepo.save(
        machineRepo.create({
          company_id: company.id,
          code: mData.code,
          name: mData.name,
          active: true,
        }),
      );
      console.log(`✅ Machine created: ${m.name} (${m.code})`);
    }
  }

  const machine = (await machineRepo.findOne({ where: { company_id: company.id, code: '1' } }))!;

  // 4. Dispositivo (ESP32)
  let device = await deviceRepo.findOne({ where: { identifier: 'ESP32-MQ-01-SENSOR-01' } });
  if (!device) {
    const defaultSecretHash = await bcrypt.hash('dev_tok_secret123', 10);
    device = await deviceRepo.save(
      deviceRepo.create({
        machine_id: machine.id,
        type: 'ESP32',
        identifier: 'ESP32-MQ-01-SENSOR-01',
        config: { sensorType: 'optical', bounceIntervalMs: 50 },
        secret_hash: defaultSecretHash,
        active: true,
      }),
    );
    console.log(`✅ Device created: ${device.identifier}`);
  }

  // 5. Produtos
  let productChocolate = await productRepo.findOne({ where: { company_id: company.id, name: 'Biscoito Recheado Chocolate' } });
  if (!productChocolate) {
    productChocolate = await productRepo.save(
      productRepo.create({
        company_id: company.id,
        name: 'Biscoito Recheado Chocolate',
        sku: 'CHOCO-001',
        active: true,
      }),
    );
    console.log(`✅ Product created: ${productChocolate.name}`);
  }

  let productMaria = await productRepo.findOne({ where: { company_id: company.id, name: 'Bolacha Maria Tradicional' } });
  if (!productMaria) {
    productMaria = await productRepo.save(
      productRepo.create({
        company_id: company.id,
        name: 'Bolacha Maria Tradicional',
        sku: 'MARIA-002',
        active: true,
      }),
    );
    console.log(`✅ Product created: ${productMaria.name}`);
  }

  // 6. Lotes
  let lot1 = await lotRepo.findOne({ where: { company_id: company.id, code: 'LOTE-2026-001' } });
  if (!lot1) {
    lot1 = await lotRepo.save(
      lotRepo.create({
        company_id: company.id,
        code: 'LOTE-2026-001',
        product_id: productChocolate.id,
      }),
    );
    console.log(`✅ Lot created: ${lot1.code}`);
  }

  let lot2 = await lotRepo.findOne({ where: { company_id: company.id, code: 'LOTE-2026-002' } });
  if (!lot2) {
    lot2 = await lotRepo.save(
      lotRepo.create({
        company_id: company.id,
        code: 'LOTE-2026-002',
        product_id: productMaria.id,
      }),
    );
    console.log(`✅ Lot created: ${lot2.code}`);
  }

  // 7. Turnos
  let shiftManha = await shiftRepo.findOne({ where: { company_id: company.id, name: 'Turno Manhã' } });
  if (!shiftManha) {
    shiftManha = await shiftRepo.save(
      shiftRepo.create({
        company_id: company.id,
        name: 'Turno Manhã',
        start_time: '06:00:00',
        end_time: '14:00:00',
        days_of_week: [1, 2, 3, 4, 5, 6],
        active: true,
      }),
    );
    console.log(`✅ Shift created: ${shiftManha.name}`);
  }

  let shiftTarde = await shiftRepo.findOne({ where: { company_id: company.id, name: 'Turno Tarde' } });
  if (!shiftTarde) {
    shiftTarde = await shiftRepo.save(
      shiftRepo.create({
        company_id: company.id,
        name: 'Turno Tarde',
        start_time: '14:00:00',
        end_time: '22:00:00',
        days_of_week: [1, 2, 3, 4, 5, 6],
        active: true,
      }),
    );
    console.log(`✅ Shift created: ${shiftTarde.name}`);
  }

  // 8. 8 Motivos de Parada Obrigatórios
  const defaultStopReasons = [
    { code: 'MANUTENCAO', label: 'Manutenção', default_priority: StopPriority.MEDIA },
    { code: 'EQUIPAMENTO', label: 'Problema no equipamento', default_priority: StopPriority.ALTA },
    { code: 'MATERIAL', label: 'Falta de material', default_priority: StopPriority.ALTA },
    { code: 'TROCA_PRODUTO', label: 'Troca de produto', default_priority: StopPriority.MEDIA },
    { code: 'LIMPEZA', label: 'Limpeza', default_priority: StopPriority.BAIXA },
    { code: 'PAUSA', label: 'Pausa', default_priority: StopPriority.BAIXA },
    { code: 'FIM_TURNO', label: 'Fim de turno', default_priority: StopPriority.BAIXA },
    { code: 'OUTROS', label: 'Outros', default_priority: StopPriority.MEDIA },
  ];

  for (const reason of defaultStopReasons) {
    let existingReason = await stopReasonRepo.findOne({ where: { company_id: company.id, code: reason.code } });
    if (!existingReason) {
      await stopReasonRepo.save(
        stopReasonRepo.create({
          company_id: company.id,
          code: reason.code,
          label: reason.label,
          default_priority: reason.default_priority,
          active: true,
        }),
      );
      console.log(`✅ Stop Reason created: ${reason.label}`);
    }
  }

  // 9. Metas de Teste
  let targetPlan = await targetPlanRepo.findOne({ where: { company_id: company.id, machine_id: machine.id } });
  if (!targetPlan) {
    targetPlan = await targetPlanRepo.save(
      targetPlanRepo.create({
        company_id: company.id,
        machine_id: machine.id,
        product_id: productChocolate.id,
        period_type: 'monthly',
        period_start: '2026-08-01',
        period_end: '2026-08-31',
        quantity: 50000,
        created_by: supervisor.id,
      }),
    );
    console.log(`✅ Target Plan created: ${targetPlan.quantity} units`);

    await targetAllocationRepo.save(
      targetAllocationRepo.create({
        target_plan_id: targetPlan.id,
        period_type: 'shift',
        period_start: '2026-08-28',
        period_end: '2026-08-28',
        shift_id: shiftManha.id,
        quantity: 2000,
        generated_by: 'manual',
        updated_by: supervisor.id,
      }),
    );
    console.log(`✅ Target Allocation created: 2000 units for shift ${shiftManha.name}`);
  }

  console.log('🎉 Database Seed Completed Successfully!');
}
