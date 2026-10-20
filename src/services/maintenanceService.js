import { queryAll, queryGet, queryRun } from '../data/db.js';
import { logActivity } from '../utils/logger.js';

export class MaintenanceService {
  /**
   * Obtiene la lista de tipos de mantenimiento preconfigurados.
   */
  static async getServiceTypes() {
    const rows = await queryAll(
      `SELECT id, name, interval_km as intervalKm, interval_months as intervalMonths, category FROM service_types`
    );
    return rows;
  }

  /**
   * Obtiene todos los vehículos registrados en el archivo de base de datos local.
   */
  static async getAllVehicles() {
    const rows = await queryAll(`
      SELECT 
        id, 
        brand, 
        model, 
        year, 
        license_plate as licensePlate, 
        current_mileage as currentMileage, 
        fuel_type as fuelType, 
        vehicle_type as vehicleType, 
        itv_expiration_date as itvExpirationDate,
        created_at as createdAt 
      FROM vehicles 
      ORDER BY created_at DESC
    `);

    if (rows.length === 0) return [];

    // --- Fix N+1: una sola query para costes y conteo de servicios ---
    const costRows = await queryAll(`
      SELECT vehicle_id as vehicleId, SUM(cost_eur) as total, COUNT(*) as cnt
      FROM maintenance_logs
      GROUP BY vehicle_id
    `);
    const costByVehicle = Object.fromEntries(costRows.map(r => [r.vehicleId, r]));

    // --- Fix N+1: una sola query para el último servicio por (vehículo, tipo) ---
    const lastServiceRows = await queryAll(`
      SELECT vehicle_id as vehicleId, service_type_id as serviceTypeId,
             MAX(mileage_at_service) as lastServiceKm,
             MAX(service_date) as lastServiceDate
      FROM maintenance_logs
      GROUP BY vehicle_id, service_type_id
    `);
    // Indexar como { vehicleId: { serviceTypeId: { lastServiceKm, lastServiceDate } } }
    const lastServiceByVehicle = {};
    for (const r of lastServiceRows) {
      if (!lastServiceByVehicle[r.vehicleId]) lastServiceByVehicle[r.vehicleId] = {};
      lastServiceByVehicle[r.vehicleId][r.serviceTypeId] = {
        lastServiceKm: r.lastServiceKm,
        lastServiceDate: r.lastServiceDate
      };
    }

    const serviceTypes = await this.getServiceTypes();

    const result = [];
    for (const vehicle of rows) {
      const costData = costByVehicle[vehicle.id];
      const totalSpentEur = costData ? Number(costData.total) : 0;
      const servicesCount = costData ? costData.cnt : 0;

      const alerts = this._computeAlerts(vehicle, serviceTypes, lastServiceByVehicle[vehicle.id] || {});
      const urgentAlertsCount = alerts.filter(a => a.status === 'URGENT').length;
      const warningAlertsCount = alerts.filter(a => a.status === 'WARNING').length;

      result.push({
        ...vehicle,
        totalSpentEur: Number(totalSpentEur.toFixed(2)),
        urgentAlertsCount,
        warningAlertsCount,
        servicesCount
      });
    }

    return result;
  }

  /**
   * Obtiene el detalle de un vehículo por su ID.
   */
  static async getVehicleById(id) {
    const vehicle = await queryGet(`
      SELECT 
        id, 
        brand, 
        model, 
        year, 
        license_plate as licensePlate, 
        current_mileage as currentMileage, 
        fuel_type as fuelType, 
        vehicle_type as vehicleType, 
        itv_expiration_date as itvExpirationDate,
        created_at as createdAt 
      FROM vehicles 
      WHERE id = ?
    `, [id]);

    if (!vehicle) {
      const error = new Error('Vehículo no encontrado en el garaje local.');
      error.statusCode = 404;
      throw error;
    }

    const alerts = await this.getVehicleAlerts(id);
    const logs = await this.getVehicleServiceLogs(id);
    const totalSpentEur = logs.reduce((sum, l) => sum + Number(l.costEur || 0), 0);

    return {
      ...vehicle,
      totalSpentEur: Number(totalSpentEur.toFixed(2)),
      alerts,
      history: logs
    };
  }

  /**
   * Registra un nuevo vehículo en la base de datos local SQLite.
   */
  static async createVehicle({ brand, model, year, licensePlate, currentMileage, fuelType, vehicleType, itvExpirationDate = null }) {
    if (!brand || !model || !year || !licensePlate || currentMileage === undefined || !fuelType || !vehicleType) {
      const error = new Error('Todos los campos del vehículo son obligatorios.');
      error.statusCode = 400;
      throw error;
    }

    const plateClean = licensePlate.trim().toUpperCase();
    const existing = await queryGet(`SELECT id FROM vehicles WHERE UPPER(license_plate) = ?`, [plateClean]);
    if (existing) {
      const error = new Error('Ya existe un vehículo registrado con esta matrícula en la base de datos.');
      error.statusCode = 409;
      throw error;
    }

    const vehicle = {
      id: `veh-${Date.now()}`,
      brand: brand.trim(),
      model: model.trim(),
      year: Number(year),
      licensePlate: plateClean,
      currentMileage: Number(currentMileage),
      fuelType,
      vehicleType,
      itvExpirationDate: itvExpirationDate || null,
      createdAt: new Date().toISOString()
    };

    await queryRun(`
      INSERT INTO vehicles (id, brand, model, year, license_plate, current_mileage, fuel_type, vehicle_type, itv_expiration_date, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      vehicle.id,
      vehicle.brand,
      vehicle.model,
      vehicle.year,
      vehicle.licensePlate,
      vehicle.currentMileage,
      vehicle.fuelType,
      vehicle.vehicleType,
      vehicle.itvExpirationDate,
      vehicle.createdAt
    ]);

    logActivity('NUEVO_VEHICULO', `Vehículo registrado: ${vehicle.brand} ${vehicle.model} (${vehicle.licensePlate}) - ${vehicle.currentMileage} km`);

    return vehicle;
  }

  /**
   * Actualiza el kilometraje actual en la base de datos.
   */
  static async updateVehicleMileage(vehicleId, newMileage) {
    const vehicle = await this.getVehicleById(vehicleId);
    const mileageNum = Number(newMileage);

    if (isNaN(mileageNum) || mileageNum < vehicle.currentMileage) {
      const error = new Error('El nuevo kilometraje debe ser igual o mayor al kilometraje actual registrado.');
      error.statusCode = 400;
      throw error;
    }

    await queryRun(`UPDATE vehicles SET current_mileage = ? WHERE id = ?`, [mileageNum, vehicleId]);
    logActivity('ACTUALIZAR_KILOMETRAJE', `Vehículo ${vehicle.brand} ${vehicle.model} (${vehicle.licensePlate}): Kilometraje actualizado de ${vehicle.currentMileage} km a ${mileageNum} km`);
    return { ...vehicle, currentMileage: mileageNum };
  }

  /**
   * Actualiza la fecha de vencimiento de ITV de un vehículo.
   */
  static async updateVehicleItvDate(vehicleId, newItvDate) {
    const vehicle = await this.getVehicleById(vehicleId);
    if (!newItvDate) {
      const error = new Error('La fecha de vencimiento de ITV es requerida.');
      error.statusCode = 400;
      throw error;
    }

    await queryRun(`UPDATE vehicles SET itv_expiration_date = ? WHERE id = ?`, [newItvDate, vehicleId]);
    logActivity('ACTUALIZAR_ITV', `Vehículo ${vehicle.brand} ${vehicle.model} (${vehicle.licensePlate}): Fecha ITV actualizada a ${newItvDate}`);
    return { ...vehicle, itvExpirationDate: newItvDate };
  }

  /**
   * Obtiene la bitácora de servicios registrados para un vehículo.
   */
  static async getVehicleServiceLogs(vehicleId) {
    const rows = await queryAll(`
      SELECT 
        ml.id, 
        ml.vehicle_id as vehicleId, 
        ml.service_type_id as serviceTypeId, 
        ml.service_date as serviceDate, 
        ml.mileage_at_service as mileageAtService, 
        ml.cost_eur as costEur, 
        ml.workshop_name as workshopName, 
        ml.notes, 
        ml.created_at as createdAt,
        st.name as serviceTypeName,
        st.category
      FROM maintenance_logs ml
      LEFT JOIN service_types st ON ml.service_type_id = st.id
      WHERE ml.vehicle_id = ?
      ORDER BY ml.service_date DESC
    `, [vehicleId]);

    return rows.map(log => ({
      ...log,
      costEur: Number(log.costEur)
    }));
  }

  /**
   * Obtiene todos los registros de mantenimiento del garaje ordenados por fecha descendente.
   */
  static async getAllServiceLogs() {
    const rows = await queryAll(`
      SELECT 
        ml.id, 
        ml.vehicle_id as vehicleId, 
        ml.service_type_id as serviceTypeId, 
        ml.service_date as serviceDate, 
        ml.mileage_at_service as mileageAtService, 
        ml.cost_eur as costEur, 
        ml.workshop_name as workshopName, 
        ml.notes, 
        ml.created_at as createdAt,
        st.name as serviceTypeName,
        st.category,
        v.brand,
        v.model,
        v.license_plate as licensePlate
      FROM maintenance_logs ml
      LEFT JOIN service_types st ON ml.service_type_id = st.id
      LEFT JOIN vehicles v ON ml.vehicle_id = v.id
      ORDER BY ml.service_date DESC
    `);

    return rows.map(log => ({
      ...log,
      costEur: Number(log.costEur)
    }));
  }

  /**
   * Elimina un registro de mantenimiento por su ID.
   */
  static async deleteServiceLog(logId) {
    const log = await queryGet(`SELECT id, vehicle_id FROM maintenance_logs WHERE id = ?`, [logId]);
    if (!log) {
      const error = new Error('Registro de mantenimiento no encontrado.');
      error.statusCode = 404;
      throw error;
    }
    await queryRun(`DELETE FROM maintenance_logs WHERE id = ?`, [logId]);
    logActivity('ELIMINAR_SERVICIO', `Eliminado registro de mantenimiento ID: ${logId} (Vehículo ID: ${log.vehicle_id})`);
    return { deleted: true, logId };
  }

  /**
   * Actualiza un registro de mantenimiento existente.
   */
  static async updateServiceLog(logId, { serviceTypeId, serviceDate, mileageAtService, costEur, workshopName = '', notes = '' }) {
    const log = await queryGet(`SELECT id, vehicle_id FROM maintenance_logs WHERE id = ?`, [logId]);
    if (!log) {
      const error = new Error('Registro de mantenimiento no encontrado.');
      error.statusCode = 404;
      throw error;
    }
    if (!serviceTypeId || !serviceDate || mileageAtService === undefined || costEur === undefined) {
      const error = new Error('Campos tipo de servicio, fecha, kilometraje y costo son obligatorios.');
      error.statusCode = 400;
      throw error;
    }
    await queryRun(`
      UPDATE maintenance_logs
      SET service_type_id = ?, service_date = ?, mileage_at_service = ?, cost_eur = ?, workshop_name = ?, notes = ?
      WHERE id = ?
    `, [
      serviceTypeId,
      serviceDate,
      Number(mileageAtService),
      Number(Number(costEur).toFixed(2)),
      workshopName.trim() || 'Taller General',
      notes.trim(),
      logId
    ]);
    logActivity('ACTUALIZAR_SERVICIO', `Actualizado servicio ID: ${logId} (${serviceTypeId}, ${costEur} €, ${mileageAtService} km)`);
    return { updated: true, logId };
  }

  /**
   * Registra un servicio de mantenimiento permanente en SQLite.
   */
  static async addServiceLog(vehicleId, { serviceTypeId, serviceDate, mileageAtService, costEur, workshopName = '', notes = '' }) {
    const vehicle = await this.getVehicleById(vehicleId);

    if (!serviceTypeId || !serviceDate || mileageAtService === undefined || costEur === undefined) {
      const error = new Error('Campos tipo de servicio, fecha, kilometraje y costo son obligatorios.');
      error.statusCode = 400;
      throw error;
    }

    const mileageNum = Number(mileageAtService);
    const costNum = Number(costEur);

    // Actualizar kilometraje si el del servicio es mayor
    if (mileageNum > vehicle.currentMileage) {
      await queryRun(`UPDATE vehicles SET current_mileage = ? WHERE id = ?`, [mileageNum, vehicleId]);
    }

    // NOTA: La fecha de próxima ITV NO se calcula automáticamente.
    // El usuario debe actualizarla manualmente desde la tarjeta del vehículo,
    // ya que depende del tipo y antigüedad del vehículo.

    const log = {
      id: `log-${Date.now()}`,
      vehicleId,
      serviceTypeId,
      serviceDate,
      mileageAtService: mileageNum,
      costEur: Number(costNum.toFixed(2)),
      workshopName: workshopName.trim() || 'Taller General',
      notes: notes.trim(),
      createdAt: new Date().toISOString()
    };

    await queryRun(`
      INSERT INTO maintenance_logs (id, vehicle_id, service_type_id, service_date, mileage_at_service, cost_eur, workshop_name, notes, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      log.id,
      log.vehicleId,
      log.serviceTypeId,
      log.serviceDate,
      log.mileageAtService,
      log.costEur,
      log.workshopName,
      log.notes,
      log.createdAt
    ]);

    logActivity('NUEVO_SERVICIO', `Vehículo ${vehicle.brand} ${vehicle.model} (${vehicle.licensePlate}): Registrado servicio '${serviceTypeId}' por ${log.costEur} € a los ${log.mileageAtService} km`);

    return log;
  }

  /**
   * Lógica pura de cálculo de alertas a partir de datos ya cargados.
   * Permite ser usada por getVehicleAlerts() y getAllVehicles() sin queries adicionales.
   */
  static _computeAlerts(vehicle, serviceTypes, lastServiceMap) {
    const alerts = [];
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    for (const st of serviceTypes) {
      if (st.id === 'ITV_INSPECTION' && vehicle.itvExpirationDate) {
        // Cálculo especial basado en fecha límite de ITV (Calendario)
        const expDate = new Date(vehicle.itvExpirationDate);
        expDate.setHours(0, 0, 0, 0);
        const diffTime = expDate.getTime() - today.getTime();
        const daysRemaining = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

        let status = 'OK';
        if (daysRemaining < 0) status = 'URGENT';
        else if (daysRemaining <= 30) status = 'WARNING';

        alerts.push({
          serviceTypeId: st.id,
          serviceName: `${st.name} (Por Fecha Calendario)`,
          category: st.category,
          intervalKm: st.intervalKm,
          intervalMonths: st.intervalMonths,
          itvExpirationDate: vehicle.itvExpirationDate,
          daysRemaining,
          isCalendarBased: true,
          status
        });

      } else if (st.intervalKm > 0 || st.intervalMonths > 0) {
        const lastData = lastServiceMap[st.id] || {};
        const lastServiceKm = lastData.lastServiceKm || 0;
        const lastServiceDate = lastData.lastServiceDate || null;

        // -- Alerta por kilometraje --
        let kmStatus = 'OK';
        const remainingKm = st.intervalKm > 0
          ? (lastServiceKm + st.intervalKm) - vehicle.currentMileage
          : Infinity;
        if (st.intervalKm > 0) {
          if (remainingKm <= 0) kmStatus = 'URGENT';
          else if (remainingKm <= 2000) kmStatus = 'WARNING';
        }

        // -- Alerta por tiempo (interval_months) --
        let timeStatus = 'OK';
        let daysOverdue = null;
        if (st.intervalMonths > 0) {
          const refDate = lastServiceDate ? new Date(lastServiceDate) : null;
          if (!refDate) {
            // Nunca se hizo: URGENT si el intervalo es inferior a 2 años, WARNING si mayor
            timeStatus = st.intervalMonths <= 24 ? 'URGENT' : 'WARNING';
          } else {
            refDate.setHours(0, 0, 0, 0);
            const dueDateMs = refDate.getTime() + st.intervalMonths * 30.44 * 24 * 60 * 60 * 1000;
            const msRemaining = dueDateMs - today.getTime();
            daysOverdue = -Math.ceil(msRemaining / (1000 * 60 * 60 * 24));
            if (msRemaining < 0) timeStatus = 'URGENT';
            else if (msRemaining < 30 * 24 * 60 * 60 * 1000) timeStatus = 'WARNING';
          }
        }

        // El status final es el más grave entre km y tiempo
        const severity = { 'URGENT': 2, 'WARNING': 1, 'OK': 0 };
        const status = severity[kmStatus] >= severity[timeStatus] ? kmStatus : timeStatus;

        alerts.push({
          serviceTypeId: st.id,
          serviceName: st.name,
          category: st.category,
          intervalKm: st.intervalKm,
          intervalMonths: st.intervalMonths,
          lastServiceKm,
          lastServiceDate,
          nextDueKm: st.intervalKm > 0 ? lastServiceKm + st.intervalKm : null,
          remainingKm: st.intervalKm > 0 ? remainingKm : null,
          daysOverdue,
          isCalendarBased: false,
          status
        });
      }
      // Si intervalKm===0 e intervalMonths===0: servicio manual, sin alerta automática
    }

    return alerts;
  }

  /**
   * Evalúa y retorna el estado de alertas preventivas para un vehículo concreto.
   * Usa una sola query agrupada en lugar de una por tipo de servicio.
   */
  static async getVehicleAlerts(vehicleId) {
    const vehicle = await queryGet(
      `SELECT id, current_mileage as currentMileage, itv_expiration_date as itvExpirationDate FROM vehicles WHERE id = ?`,
      [vehicleId]
    );
    if (!vehicle) return [];

    const serviceTypes = await this.getServiceTypes();

    // Una sola query batch en lugar de N queries (una por tipo de servicio)
    const lastServiceRows = await queryAll(`
      SELECT service_type_id as serviceTypeId,
             MAX(mileage_at_service) as lastServiceKm,
             MAX(service_date) as lastServiceDate
      FROM maintenance_logs
      WHERE vehicle_id = ?
      GROUP BY service_type_id
    `, [vehicleId]);

    const lastServiceMap = Object.fromEntries(
      lastServiceRows.map(r => [r.serviceTypeId, { lastServiceKm: r.lastServiceKm, lastServiceDate: r.lastServiceDate }])
    );

    return this._computeAlerts(vehicle, serviceTypes, lastServiceMap);
  }

  /**
   * Elimina un vehículo y todos sus registros asociados de la base de datos local.
   * @param {string} vehicleId - ID del vehículo a eliminar
   */
  static async deleteVehicle(vehicleId) {
    const vehicle = await queryGet(`SELECT id, brand, model, license_plate as licensePlate FROM vehicles WHERE id = ?`, [vehicleId]);
    if (!vehicle) {
      const error = new Error('Vehículo no encontrado en el garaje local.');
      error.statusCode = 404;
      throw error;
    }

    // Eliminar logs de mantenimiento asociados primero
    await queryRun(`DELETE FROM maintenance_logs WHERE vehicle_id = ?`, [vehicleId]);
    // Eliminar el vehículo
    await queryRun(`DELETE FROM vehicles WHERE id = ?`, [vehicleId]);

    logActivity('ELIMINAR_VEHICULO', `Vehículo eliminado: ${vehicle.brand} ${vehicle.model} (${vehicle.licensePlate}) - ID: ${vehicleId}`);

    return { deleted: true, vehicleId, name: `${vehicle.brand} ${vehicle.model}` };
  }

  /**
   * Borra todos los datos de la base de datos (vehículos, logs de mantenimiento).
   * Los tipos de servicio predefinidos se conservan.
   */
  static async resetDatabase() {
    await queryRun(`DELETE FROM maintenance_logs`);
    await queryRun(`DELETE FROM vehicles`);
    return { reset: true, message: 'Todos los vehículos y registros han sido eliminados. Los tipos de servicio se mantienen.' };
  }

  /**
   * Resumen global del garaje a partir del archivo SQLite local.
   */
  static async getGarageSummary() {
    const vehicles = await this.getAllVehicles();
    const totalSpentRow = await queryGet(`SELECT SUM(cost_eur) as totalSpent FROM maintenance_logs`);
    const totalServicesRow = await queryGet(`SELECT COUNT(*) as totalCount FROM maintenance_logs`);

    const totalSpentEur = totalSpentRow && totalSpentRow.totalSpent ? Number(totalSpentRow.totalSpent) : 0;
    const totalServicesCount = totalServicesRow ? totalServicesRow.totalCount : 0;

    let urgentCount = 0;
    let warningCount = 0;

    for (const v of vehicles) {
      urgentCount += v.urgentAlertsCount || 0;
      warningCount += v.warningAlertsCount || 0;
    }

    return {
      vehiclesCount: vehicles.length,
      totalServicesCount,
      totalSpentEur: Number(totalSpentEur.toFixed(2)),
      urgentAlertsCount: urgentCount,
      warningAlertsCount: warningCount
    };
  }
}
