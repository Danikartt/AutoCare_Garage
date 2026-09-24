import test from 'node:test';
import assert from 'node:assert/strict';
import { MaintenanceService } from '../src/services/maintenanceService.js';
import { initDatabase, queryRun } from '../src/data/db.js';

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
  assert.ok(summary.vehiclesCount >= 1);
  assert.ok(summary.totalSpentEur >= 0);
});
