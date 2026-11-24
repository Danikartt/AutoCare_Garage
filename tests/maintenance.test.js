import test from 'node:test';
import assert from 'node:assert/strict';
// Garantizar aislamiento total: por defecto los tests usan una BD nueva en memoria (:memory:).
process.env.DB_PATH = process.env.DB_PATH || ':memory:';
const { MaintenanceService } = await import('../src/services/maintenanceService.js');
const { initDatabase, queryRun } = await import('../src/data/db.js');

test('1. Inicializar la base de datos de pruebas', async () => {
  await initDatabase();
  const types = await MaintenanceService.getServiceTypes();
  assert.equal(types.length >= 5, true);
  const oilChange = types.find(t => t.id === 'OIL_CHANGE');
  assert.equal(oilChange.intervalKm, 15000);
});

test('2. Registro de nuevo vehículo y prevención de matrículas duplicadas', async () => {
  const plate = `TEST-${Date.now()}`;
  const newVehicle = await MaintenanceService.createVehicle({
    brand: "Seat",
    model: "Leon FR",
    year: 2020,
    licensePlate: plate,
    currentMileage: 60000,
    fuelType: "DIESEL",
    vehicleType: "COCHE"
  });

  assert.equal(newVehicle.brand, "Seat");
  assert.equal(newVehicle.licensePlate, plate);

  // Matrícula duplicada debe arrojar error 409
  await assert.rejects(async () => {
    await MaintenanceService.createVehicle({
      brand: "Audi",
      model: "A4",
      year: 2021,
      licensePlate: plate.toLowerCase(),
      currentMileage: 30000,
      fuelType: "GASOLINA",
      vehicleType: "COCHE"
    });
  }, (err) => err.statusCode === 409);

  // Limpieza de prueba
  await MaintenanceService.deleteVehicle(newVehicle.id);
});

test('3. Registro de servicio de mantenimiento y actualización de kilometraje', async () => {
  const plate = `LOG-${Date.now()}`;
  const vehicle = await MaintenanceService.createVehicle({
    brand: "Peugeot",
    model: "308",
    year: 2021,
    licensePlate: plate,
    currentMileage: 40000,
    fuelType: "GASOLINA",
    vehicleType: "COCHE"
  });

  const log = await MaintenanceService.addServiceLog(vehicle.id, {
    serviceTypeId: 'OIL_CHANGE',
    serviceDate: '2026-09-05',
    mileageAtService: 45000, // Mayor que 40000
    costEur: 150.00,
    workshopName: 'Taller Oficial',
    notes: 'Cambio sintético 5W30'
  });

  assert.equal(log.mileageAtService, 45000);
  assert.equal(log.costEur, 150.00);

  // El kilometraje debe haberse actualizado a 45000
  const updatedVehicle = await MaintenanceService.getVehicleById(vehicle.id);
  assert.equal(updatedVehicle.currentMileage, 45000);

  // Limpieza de prueba
  await MaintenanceService.deleteVehicle(vehicle.id);
});

test('4. Evaluación Preventiva de Alertas', async () => {
  const plate = `ALERT-${Date.now()}`;
  const vehicle = await MaintenanceService.createVehicle({
    brand: "Honda",
    model: "Civic",
    year: 2019,
    licensePlate: plate,
    currentMileage: 30000, // Sin registros de frenos (intervalo 25000km) -> URGENT
    fuelType: "GASOLINA",
    vehicleType: "COCHE"
  });

  const alerts = await MaintenanceService.getVehicleAlerts(vehicle.id);
  assert.ok(alerts.length > 0);

  const brakeAlert = alerts.find(a => a.serviceTypeId === 'BRAKES');
  assert.equal(brakeAlert.status, 'URGENT');

  // Limpieza de prueba
  await MaintenanceService.deleteVehicle(vehicle.id);
});

test('5. Resumen Financiero y Estadísticas del Garaje', async () => {
  const summary = await MaintenanceService.getGarageSummary();
  // Con BD en :memory: la BD empieza vacía, por lo que vehiclesCount puede ser >= 0
  assert.ok(summary.vehiclesCount >= 0);
  assert.ok(summary.totalSpentEur >= 0);
});

test('6. Evaluación de alertas por tiempo (interval_months)', async () => {
  const plate = `TIME-${Date.now()}`;
  const vehicle = await MaintenanceService.createVehicle({
    brand: "Toyota",
    model: "Yaris",
    year: 2022,
    licensePlate: plate,
    currentMileage: 5000, // Poco kilometraje (no vence por km)
    fuelType: "HIBRIDO",
    vehicleType: "COCHE"
  });

  // Registramos un cambio de aceite hace más de 1 año (OIL_CHANGE: intervalMonths = 12)
  await MaintenanceService.addServiceLog(vehicle.id, {
    serviceTypeId: 'OIL_CHANGE',
    serviceDate: '2024-01-01',
    mileageAtService: 4000,
    costEur: 100,
    workshopName: 'Taller Rápido',
    notes: 'Cambio de aceite anual'
  });

  const alerts = await MaintenanceService.getVehicleAlerts(vehicle.id);
  const oilAlert = alerts.find(a => a.serviceTypeId === 'OIL_CHANGE');

  // Venció por tiempo aunque le falten 14000 km
  assert.equal(oilAlert.status, 'URGENT');
  assert.ok(oilAlert.daysOverdue > 0);

  // Limpieza
  await MaintenanceService.deleteVehicle(vehicle.id);
});

test('7. Reset de la base de datos limpia datos pero mantiene tipos de servicio', async () => {
  const resetRes = await MaintenanceService.resetDatabase();
  assert.equal(resetRes.reset, true);

  const vehicles = await MaintenanceService.getAllVehicles();
  assert.equal(vehicles.length, 0);

  const types = await MaintenanceService.getServiceTypes();
  assert.ok(types.length >= 5);
});

test('8. Consulta consolidada de todos los servicios del garaje (getAllServiceLogs)', async () => {
  const plate = `LOGS-${Date.now()}`;
  const v = await MaintenanceService.createVehicle({
    brand: "Renault",
    model: "Clio",
    year: 2018,
    licensePlate: plate,
    currentMileage: 80000,
    fuelType: "GASOLINA",
    vehicleType: "COCHE"
  });

  await MaintenanceService.addServiceLog(v.id, {
    serviceTypeId: 'OIL_CHANGE',
    serviceDate: '2026-03-01',
    mileageAtService: 80000,
    costEur: 120,
    workshopName: 'Taller Oficial',
    notes: 'Revisión periódica'
  });

  const allLogs = await MaintenanceService.getAllServiceLogs();
  assert.ok(allLogs.length >= 1);
  const logFound = allLogs.find(l => l.vehicleId === v.id);
  assert.ok(logFound);
  assert.equal(logFound.brand, "Renault");
  assert.equal(logFound.licensePlate, plate);

  await MaintenanceService.deleteVehicle(v.id);
});

test('9. Rechaza entradas numéricas inválidas o negativas con error 400', async () => {
  await assert.rejects(
    () => MaintenanceService.createVehicle({
      brand: 'Ford',
      model: 'Focus',
      year: 'no-es-año',
      licensePlate: 'BAD-YEAR',
      currentMileage: 1000,
      fuelType: 'GASOLINA',
      vehicleType: 'COCHE'
    }),
    (err) => err.statusCode === 400
  );

  await assert.rejects(
    () => MaintenanceService.createVehicle({
      brand: 'Ford',
      model: 'Focus',
      year: 2020,
      licensePlate: 'BAD-KM',
      currentMileage: -50,
      fuelType: 'GASOLINA',
      vehicleType: 'COCHE'
    }),
    (err) => err.statusCode === 400
  );

  const v = await MaintenanceService.createVehicle({
    brand: 'Ford',
    model: 'Focus',
    year: 2020,
    licensePlate: `VAL-${Date.now()}`,
    currentMileage: 10000,
    fuelType: 'GASOLINA',
    vehicleType: 'COCHE'
  });

  await assert.rejects(
    () => MaintenanceService.updateVehicleMileage(v.id, 'abc'),
    (err) => err.statusCode === 400
  );

  await assert.rejects(
    () => MaintenanceService.addServiceLog(v.id, {
      serviceTypeId: 'OIL_CHANGE',
      serviceDate: '2026-10-01',
      mileageAtService: 11000,
      costEur: -20
    }),
    (err) => err.statusCode === 400
  );

  await MaintenanceService.deleteVehicle(v.id);
});

test('10. Creación consecutiva genera IDs únicos sin colisión', async () => {
  const suffix = Date.now();
  const [v1, v2] = await Promise.all([
    MaintenanceService.createVehicle({
      brand: 'Seat',
      model: 'Ibiza',
      year: 2020,
      licensePlate: `UUID-A-${suffix}`,
      currentMileage: 1000,
      fuelType: 'GASOLINA',
      vehicleType: 'COCHE'
    }),
    MaintenanceService.createVehicle({
      brand: 'Seat',
      model: 'Arona',
      year: 2021,
      licensePlate: `UUID-B-${suffix}`,
      currentMileage: 2000,
      fuelType: 'GASOLINA',
      vehicleType: 'COCHE'
    })
  ]);

  assert.notEqual(v1.id, v2.id);

  const [l1, l2] = await Promise.all([
    MaintenanceService.addServiceLog(v1.id, {
      serviceTypeId: 'OIL_CHANGE',
      serviceDate: '2026-10-01',
      mileageAtService: 1500,
      costEur: 80
    }),
    MaintenanceService.addServiceLog(v1.id, {
      serviceTypeId: 'CABIN_FILTER',
      serviceDate: '2026-10-01',
      mileageAtService: 1500,
      costEur: 35
    })
  ]);

  assert.notEqual(l1.id, l2.id);

  await MaintenanceService.deleteVehicle(v1.id);
  await MaintenanceService.deleteVehicle(v2.id);
});

test('11. Edición y borrado de registros de mantenimiento (updateServiceLog / deleteServiceLog)', async () => {
  const v = await MaintenanceService.createVehicle({
    brand: 'Volkswagen',
    model: 'Golf',
    year: 2022,
    licensePlate: `EDIT-${Date.now()}`,
    currentMileage: 20000,
    fuelType: 'DIESEL',
    vehicleType: 'COCHE'
  });

  const log = await MaintenanceService.addServiceLog(v.id, {
    serviceTypeId: 'OIL_CHANGE',
    serviceDate: '2026-10-10',
    mileageAtService: 20000,
    costEur: 110,
    workshopName: 'Taller A',
    notes: 'Inicial'
  });

  const updated = await MaintenanceService.updateServiceLog(log.id, {
    serviceTypeId: 'OIL_CHANGE',
    serviceDate: '2026-10-11',
    mileageAtService: 20100,
    costEur: 125.5,
    workshopName: 'Taller B',
    notes: 'Corregido'
  });
  assert.equal(updated.updated, true);

  const logsAfterUpdate = await MaintenanceService.getVehicleServiceLogs(v.id);
  assert.equal(logsAfterUpdate.length, 1);
  assert.equal(logsAfterUpdate[0].costEur, 125.5);
  assert.equal(logsAfterUpdate[0].workshopName, 'Taller B');

  const deleted = await MaintenanceService.deleteServiceLog(log.id);
  assert.equal(deleted.deleted, true);

  const logsAfterDelete = await MaintenanceService.getVehicleServiceLogs(v.id);
  assert.equal(logsAfterDelete.length, 0);

  await MaintenanceService.deleteVehicle(v.id);
});

test('12. Endpoints HTTP principales en Express (/api/v1/*)', async () => {
  const { app } = await import('../src/server.js');
  const server = await new Promise((resolve) => {
    const s = app.listen(0, '127.0.0.1', () => resolve(s));
  });

  try {
    const { port } = server.address();
    const baseUrl = `http://127.0.0.1:${port}`;

    const typesRes = await fetch(`${baseUrl}/api/v1/service-types`);
    assert.equal(typesRes.status, 200);
    const types = await typesRes.json();
    assert.ok(Array.isArray(types) && types.length >= 5);

    const badRes = await fetch(`${baseUrl}/api/v1/vehicles`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        brand: 'Opel',
        model: 'Corsa',
        year: 2020,
        licensePlate: 'HTTP-BAD',
        currentMileage: -10,
        fuelType: 'GASOLINA',
        vehicleType: 'COCHE'
      })
    });
    assert.equal(badRes.status, 400);

    const createRes = await fetch(`${baseUrl}/api/v1/vehicles`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        brand: 'Opel',
        model: 'Corsa',
        year: 2020,
        licensePlate: `HTTP-${Date.now()}`,
        currentMileage: 15000,
        fuelType: 'GASOLINA',
        vehicleType: 'COCHE'
      })
    });
    assert.equal(createRes.status, 201);
    const created = await createRes.json();

    const listRes = await fetch(`${baseUrl}/api/v1/vehicles`);
    assert.equal(listRes.status, 200);
    const list = await listRes.json();
    assert.ok(list.some(item => item.id === created.id));

    const delRes = await fetch(`${baseUrl}/api/v1/vehicles/${created.id}`, { method: 'DELETE' });
    assert.equal(delRes.status, 200);
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
});


