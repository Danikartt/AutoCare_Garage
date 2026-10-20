document.addEventListener('DOMContentLoaded', () => {
  // Global State
  let state = {
    vehicles: [],
    serviceTypes: [],
    selectedVehicleForMileage: null,
    summary: null
  };

  // DOM Elements
  const navBtns = document.querySelectorAll('.nav-btn');
  const tabContents = document.querySelectorAll('.tab-content');
  const toast = document.getElementById('toast');

  // Stats
  const statVehicles = document.getElementById('stat-total-vehicles');
  const statServices = document.getElementById('stat-total-services');
  const statSpent = document.getElementById('stat-total-spent');
  const statUrgent = document.getElementById('stat-urgent-alerts');

  // Grids & Container
  const garageGrid = document.getElementById('garage-grid');
  const alertsDashboard = document.getElementById('alerts-dashboard');
  const servicesTimeline = document.getElementById('services-timeline');
  const selectAlertVehicle = document.getElementById('select-alert-vehicle');
  const selectLogVehicle = document.getElementById('select-log-vehicle');

  // Modals & Forms
  const modalAddVehicle = document.getElementById('modal-add-vehicle');
  const modalUpdateMileage = document.getElementById('modal-update-mileage');
  const modalAddService = document.getElementById('modal-add-service');
  
  const formAddVehicle = document.getElementById('form-add-vehicle');
  const formUpdateMileage = document.getElementById('form-update-mileage');
  const formAddService = document.getElementById('form-add-service');

  const btnOpenAddVehicle = document.getElementById('btn-open-add-vehicle-modal');
  const btnOpenAddLog = document.getElementById('btn-open-add-log-modal');

  // --- 1. Navigation ---
  navBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      navBtns.forEach(b => b.classList.remove('active'));
      tabContents.forEach(c => c.classList.remove('active'));

      btn.classList.add('active');
      const targetTab = btn.getAttribute('data-tab');
      document.getElementById(targetTab).classList.add('active');

      if (targetTab === 'tab-alerts') renderAlertsDashboard();
      if (targetTab === 'tab-logs') renderServicesTimeline();
    });
  });

  // --- 2. Initial Data Loading ---
  async function init() {
    try {
      const [vRes, sRes, summaryRes] = await Promise.all([
        fetch('/api/v1/vehicles').then(r => r.json()),
        fetch('/api/v1/service-types').then(r => r.json()),
        fetch('/api/v1/summary').then(r => r.json())
      ]);

      state.vehicles = vRes;
      state.serviceTypes = sRes;
      state.summary = summaryRes;

      updateStatsBar();
      populateDropdowns();
      renderGarageGrid();
    } catch (err) {
      showToast('Error cargando los datos del garaje.', 'danger');
    }
  }

  function updateStatsBar() {
    if (!state.summary) return;
    statVehicles.textContent = state.summary.vehiclesCount;
    statServices.textContent = state.summary.totalServicesCount;
    statSpent.textContent = `${state.summary.totalSpentEur.toLocaleString('es-ES', { minimumFractionDigits: 2 })} €`;
    statUrgent.textContent = state.summary.urgentAlertsCount;
  }

  function populateDropdowns() {
    // Populate vehicle selects
    selectAlertVehicle.innerHTML = '<option value="">Todos los vehículos</option>';
    selectLogVehicle.innerHTML = '<option value="">Todos los vehículos</option>';
    const sVehicleSelect = document.getElementById('s-vehicle');
    sVehicleSelect.innerHTML = '<option value="">Selecciona vehículo...</option>';

    state.vehicles.forEach(v => {
      const label = `${v.brand} ${v.model} (${v.licensePlate})`;
      selectAlertVehicle.innerHTML += `<option value="${v.id}">${label}</option>`;
      selectLogVehicle.innerHTML += `<option value="${v.id}">${label}</option>`;
      sVehicleSelect.innerHTML += `<option value="${v.id}">${label}</option>`;
    });

    // Populate service types in Add Service Modal and Edit Service Modal
    const sTypeSelect = document.getElementById('s-type');
    sTypeSelect.innerHTML = '<option value="">Selecciona tipo de mantenimiento...</option>';
    const editTypeSelect = document.getElementById('edit-s-type');
    editTypeSelect.innerHTML = '<option value="">Selecciona tipo de mantenimiento...</option>';

    state.serviceTypes.forEach(st => {
      const opt = `<option value="${st.id}">${st.name}</option>`;
      sTypeSelect.innerHTML += opt;
      editTypeSelect.innerHTML += opt;
    });
  }

  // --- 3. Render Garage Grid ---
  function renderGarageGrid() {
    if (!state.vehicles || state.vehicles.length === 0) {
      garageGrid.innerHTML = '<p class="placeholder-text">No tienes vehículos registrados en tu garaje.</p>';
      return;
    }

    garageGrid.innerHTML = state.vehicles.map(v => {
      const icon = v.vehicleType === 'MOTO' ? '🏍️' : v.vehicleType === 'FURGONETA' ? '🚐' : '🏎️';
      const itvFormatted = v.itvExpirationDate ? v.itvExpirationDate : 'Sin definir';

      return `
        <div class="vehicle-card">
          <div>
            <div class="vehicle-header">
              <div class="vehicle-title">
                <h3>${icon} ${v.brand} ${v.model}</h3>
                <p>Año: ${v.year} | Combustible: ${v.fuelType}</p>
              </div>
              <span class="vehicle-badge">${v.licensePlate}</span>
            </div>

            <div class="vehicle-metrics">
              <div class="metric-item">
                <span>Kilometraje Actual</span>
                <strong>${v.currentMileage.toLocaleString()} km</strong>
              </div>
              <div class="metric-item">
                <span>Próxima ITV</span>
                <strong>📅 ${itvFormatted}</strong>
              </div>
              <div class="metric-item">
                <span>Inversión Total</span>
                <strong>${v.totalSpentEur.toLocaleString('es-ES', { minimumFractionDigits: 2 })} €</strong>
              </div>
              <div class="metric-item">
                <span>Alertas Críticas</span>
                <strong style="color:${v.urgentAlertsCount > 0 ? 'var(--danger)' : 'var(--success)'}">
                  ${v.urgentAlertsCount > 0 ? `🚨 ${v.urgentAlertsCount} pendientes` : '🟢 Al día'}
                </strong>
              </div>
            </div>
          </div>

          <div class="vehicle-footer-actions" style="flex-wrap: wrap;">
            <button class="btn btn-outline btn-sm btn-update-mileage" data-v-id="${v.id}">⏱️ Actualizar Km</button>
            <button class="btn btn-outline btn-sm btn-update-itv" data-v-id="${v.id}">📅 Fecha ITV</button>
            <button class="btn btn-primary btn-sm btn-quick-service" data-v-id="${v.id}">🛠️ Servicio</button>
            <button class="btn btn-outline btn-sm btn-export-vehicle-pdf" data-v-id="${v.id}" title="Generar e imprimir informe técnico en PDF">📄 PDF</button>
            <button class="btn btn-danger btn-sm btn-delete-vehicle" data-v-id="${v.id}" data-v-name="${v.brand} ${v.model}">🗑️ Eliminar</button>
          </div>
        </div>
      `;
    }).join('');

    // Handlers for mileage, ITV date, quick service, export PDF and delete
    document.querySelectorAll('.btn-update-mileage').forEach(btn => {
      btn.addEventListener('click', () => openUpdateMileageModal(btn.getAttribute('data-v-id')));
    });

    document.querySelectorAll('.btn-update-itv').forEach(btn => {
      btn.addEventListener('click', () => openUpdateItvModal(btn.getAttribute('data-v-id')));
    });

    document.querySelectorAll('.btn-quick-service').forEach(btn => {
      btn.addEventListener('click', () => openAddServiceModal(btn.getAttribute('data-v-id')));
    });

    document.querySelectorAll('.btn-export-vehicle-pdf').forEach(btn => {
      btn.addEventListener('click', () => exportVehiclePdf(btn.getAttribute('data-v-id')));
    });

    document.querySelectorAll('.btn-delete-vehicle').forEach(btn => {
      btn.addEventListener('click', () => deleteVehicle(btn.getAttribute('data-v-id'), btn.getAttribute('data-v-name')));
    });
  }

  // --- 4. Render Preventive Alerts Dashboard ---
  async function renderAlertsDashboard() {
    alertsDashboard.innerHTML = '<div class="loading">Cargando alertas...</div>';

    const selectedVId = selectAlertVehicle.value;
    const targetVehicles = selectedVId 
      ? state.vehicles.filter(v => v.id === selectedVId) 
      : state.vehicles;

    if (targetVehicles.length === 0) {
      alertsDashboard.innerHTML = '<p class="placeholder-text">No hay vehículos para evaluar.</p>';
      return;
    }

    try {
      const alertsPromises = targetVehicles.map(v => 
        fetch(`/api/v1/vehicles/${v.id}/alerts`).then(r => r.json()).then(alerts => ({ vehicle: v, alerts }))
      );

      const results = await Promise.all(alertsPromises);

      let html = '';
      results.forEach(({ vehicle, alerts }) => {
        html += `
          <div class="wizard-card" style="margin-bottom:1.5rem;">
            <h3 style="margin-bottom:1rem;">🚘 ${vehicle.brand} ${vehicle.model} (${vehicle.licensePlate}) - Km Actual: ${vehicle.currentMileage.toLocaleString()} km</h3>
            <div class="alerts-container">
              ${alerts.map(a => {
                if (a.isCalendarBased) {
                  return `
                    <div class="alert-card status-${a.status}">
                      <div class="alert-info">
                        <h4>📅 ${a.serviceName}</h4>
                        <p>Fecha Vencimiento Registrada: <strong>${a.itvExpirationDate || 'Sin definir'}</strong></p>
                      </div>
                      <div style="text-align:right;">
                        <span class="alert-status-tag tag-${a.status}">
                          ${a.status === 'URGENT' ? `🔴 ITV CADUCADA (Hace ${Math.abs(a.daysRemaining)} días)` :
                            a.status === 'WARNING' ? `🟡 ITV Vence Pronto (En ${a.daysRemaining} días)` : 
                            `🟢 ITV Al Día (Vence en ${a.daysRemaining} días)`}
                        </span>
                      </div>
                    </div>
                  `;
                }

                return `
                  <div class="alert-card status-${a.status}">
                    <div class="alert-info">
                      <h4>${a.serviceName}</h4>
                      <p>Último servicio: ${a.lastServiceKm > 0 ? `${a.lastServiceKm.toLocaleString()} km` : 'Sin registro prev.'} | Próximo recomendado: <strong>${a.nextDueKm.toLocaleString()} km</strong></p>
                    </div>
                    <div style="text-align:right;">
                      <span class="alert-status-tag tag-${a.status}">
                        ${a.status === 'URGENT' ? `🔴 Vencido (${Math.abs(a.remainingKm).toLocaleString()} km pasados)` :
                          a.status === 'WARNING' ? `🟡 Revisar Pronto (${a.remainingKm.toLocaleString()} km rest.)` : 
                          `🟢 Al Día (${a.remainingKm.toLocaleString()} km rest.)`}
                      </span>
                    </div>
                  </div>
                `;
              }).join('')}
            </div>
          </div>
        `;
      });

      alertsDashboard.innerHTML = html;

    } catch (err) {
      alertsDashboard.innerHTML = '<p class="placeholder-text">Error cargando las alertas.</p>';
    }
  }

  selectAlertVehicle.addEventListener('change', renderAlertsDashboard);

  // --- 5. Render Services Timeline ---
  async function renderServicesTimeline() {
    servicesTimeline.innerHTML = '<div class="loading">Cargando bitácora de servicios...</div>';

    const selectedVId = selectLogVehicle.value;
    const targetVehicles = selectedVId 
      ? state.vehicles.filter(v => v.id === selectedVId) 
      : state.vehicles;

    try {
      const logsPromises = targetVehicles.map(v => 
        fetch(`/api/v1/vehicles/${v.id}/services`).then(r => r.json()).then(logs => logs.map(l => ({ ...l, vehicleName: `${v.brand} ${v.model}` })))
      );

      const allLogsArrays = await Promise.all(logsPromises);
      const allLogs = allLogsArrays.flat().sort((a, b) => new Date(b.serviceDate) - new Date(a.serviceDate));

      if (allLogs.length === 0) {
        servicesTimeline.innerHTML = '<p class="placeholder-text">No hay servicios registrados en la bitácora.</p>';
        return;
      }

      servicesTimeline.innerHTML = allLogs.map(log => `
        <div class="service-item-card">
          <div class="service-main">
            <h4>${log.serviceTypeName} <small style="font-size:0.8rem; color:var(--primary);">(${log.vehicleName})</small></h4>
            <p>📅 Fecha: <strong>${log.serviceDate}</strong> | ⏱️ Kilometraje: <strong>${log.mileageAtService.toLocaleString()} km</strong></p>
            <p>🏪 Taller: ${log.workshopName || 'Taller General'} ${log.notes ? `| 📝 ${log.notes}` : ''}</p>
          </div>
          <div style="display:flex; flex-direction:column; align-items:flex-end; gap:0.5rem;">
            <div class="service-price">${log.costEur.toLocaleString('es-ES', { minimumFractionDigits: 2 })} €</div>
            <div style="display:flex; gap:0.4rem;">
              <button class="btn btn-outline btn-sm btn-edit-log"
                data-log-id="${log.id}"
                data-service-type="${log.serviceTypeId}"
                data-date="${log.serviceDate}"
                data-mileage="${log.mileageAtService}"
                data-cost="${log.costEur}"
                data-workshop="${log.workshopName || ''}"
                data-notes="${log.notes || ''}"
              >✏️ Editar</button>
              <button class="btn btn-danger btn-sm btn-delete-log" data-log-id="${log.id}">🗑️</button>
            </div>
          </div>
        </div>
      `).join('');

      // Bind edit/delete handlers
      document.querySelectorAll('.btn-edit-log').forEach(btn => {
        btn.addEventListener('click', () => openEditServiceModal(btn.dataset));
      });
      document.querySelectorAll('.btn-delete-log').forEach(btn => {
        btn.addEventListener('click', () => deleteServiceLog(btn.getAttribute('data-log-id')));
      });

    } catch (err) {
      servicesTimeline.innerHTML = '<p class="placeholder-text">Error cargando la bitácora.</p>';
    }
  }

  selectLogVehicle.addEventListener('change', renderServicesTimeline);

  // --- 6. Form Handlers & Modal Logic ---

  // Modal Open/Close Buttons
  btnOpenAddVehicle.addEventListener('click', () => modalAddVehicle.classList.remove('hidden'));
  btnOpenAddLog.addEventListener('click', () => openAddServiceModal());

  document.querySelectorAll('.modal-close, [data-modal]').forEach(btn => {
    btn.addEventListener('click', () => {
      const modalId = btn.getAttribute('data-modal');
      if (modalId) document.getElementById(modalId).classList.add('hidden');
    });
  });

  // Add Vehicle
  formAddVehicle.addEventListener('submit', async (e) => {
    e.preventDefault();

    const payload = {
      brand: document.getElementById('v-brand').value,
      model: document.getElementById('v-model').value,
      year: document.getElementById('v-year').value,
      licensePlate: document.getElementById('v-plate').value,
      currentMileage: document.getElementById('v-mileage').value,
      fuelType: document.getElementById('v-fuel').value,
      vehicleType: document.getElementById('v-type').value,
      itvExpirationDate: document.getElementById('v-itv').value || null
    };

    try {
      const res = await fetch('/api/v1/vehicles', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error registrando vehículo.');

      showToast(`¡Vehículo ${data.brand} ${data.model} registrado exitosamente!`);
      modalAddVehicle.classList.add('hidden');
      formAddVehicle.reset();
      await refreshAllData();

    } catch (err) {
      showToast(err.message, 'danger');
    }
  });

  // Update Mileage Modal
  function openUpdateMileageModal(vehicleId) {
    const vehicle = state.vehicles.find(v => v.id === vehicleId);
    if (!vehicle) return;

    state.selectedVehicleForMileage = vehicle;
    document.getElementById('modal-mileage-vehicle-info').textContent = `Vehículo: ${vehicle.brand} ${vehicle.model} (${vehicle.licensePlate}) - Km Actual: ${vehicle.currentMileage.toLocaleString()} km`;
    document.getElementById('new-mileage-input').value = vehicle.currentMileage;
    modalUpdateMileage.classList.remove('hidden');
  }

  formUpdateMileage.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!state.selectedVehicleForMileage) return;

    const newKm = document.getElementById('new-mileage-input').value;

    try {
      const res = await fetch(`/api/v1/vehicles/${state.selectedVehicleForMileage.id}/mileage`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentMileage: newKm })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error al actualizar kilometraje.');

      showToast(`Kilometraje actualizado a ${Number(newKm).toLocaleString()} km.`);
      modalUpdateMileage.classList.add('hidden');
      await refreshAllData();

    } catch (err) {
      showToast(err.message, 'danger');
    }
  });

  // Update ITV Date Modal
  const modalUpdateItv = document.getElementById('modal-update-itv');
  const formUpdateItv = document.getElementById('form-update-itv');

  function openUpdateItvModal(vehicleId) {
    const vehicle = state.vehicles.find(v => v.id === vehicleId);
    if (!vehicle) return;

    state.selectedVehicleForItv = vehicle;
    document.getElementById('modal-itv-vehicle-info').textContent = `Vehículo: ${vehicle.brand} ${vehicle.model} (${vehicle.licensePlate}) - ITV Actual: ${vehicle.itvExpirationDate || 'Sin fecha'}`;
    if (vehicle.itvExpirationDate) {
      document.getElementById('new-itv-input').value = vehicle.itvExpirationDate;
    }
    modalUpdateItv.classList.remove('hidden');
  }

  formUpdateItv.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!state.selectedVehicleForItv) return;

    const newItvDate = document.getElementById('new-itv-input').value;

    try {
      const res = await fetch(`/api/v1/vehicles/${state.selectedVehicleForItv.id}/itv`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ itvExpirationDate: newItvDate })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error al actualizar fecha de ITV.');

      showToast(`Fecha de ITV actualizada a ${newItvDate}.`);
      modalUpdateItv.classList.add('hidden');
      await refreshAllData();

    } catch (err) {
      showToast(err.message, 'danger');
    }
  });

  // Add Service Log Modal
  function openAddServiceModal(vehicleId = null) {
    if (vehicleId) {
      document.getElementById('s-vehicle').value = vehicleId;
      const vehicle = state.vehicles.find(v => v.id === vehicleId);
      if (vehicle) {
        document.getElementById('s-mileage').value = vehicle.currentMileage;
      }
    }
    document.getElementById('s-date').value = new Date().toISOString().split('T')[0];
    modalAddService.classList.remove('hidden');
  }

  document.getElementById('s-vehicle').addEventListener('change', (e) => {
    const vId = e.target.value;
    const vehicle = state.vehicles.find(v => v.id === vId);
    if (vehicle) {
      document.getElementById('s-mileage').value = vehicle.currentMileage;
    }
  });

  formAddService.addEventListener('submit', async (e) => {
    e.preventDefault();

    const vehicleId = document.getElementById('s-vehicle').value;
    if (!vehicleId) {
      showToast('Selecciona un vehículo.', 'danger');
      return;
    }

    const payload = {
      serviceTypeId: document.getElementById('s-type').value,
      serviceDate: document.getElementById('s-date').value,
      mileageAtService: document.getElementById('s-mileage').value,
      costEur: document.getElementById('s-cost').value,
      workshopName: document.getElementById('s-workshop').value,
      notes: document.getElementById('s-notes').value
    };

    try {
      const res = await fetch(`/api/v1/vehicles/${vehicleId}/services`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error registrando servicio.');

      showToast('¡Servicio de mantenimiento registrado exitosamente!');
      modalAddService.classList.add('hidden');
      formAddService.reset();
      await refreshAllData();

    } catch (err) {
      showToast(err.message, 'danger');
    }
  });

  // --- 7. Edit & Delete Service Log ---
  const modalEditService = document.getElementById('modal-edit-service');
  const formEditService = document.getElementById('form-edit-service');

  function openEditServiceModal({ logId, serviceType, date, mileage, cost, workshop, notes }) {
    document.getElementById('edit-log-id').value = logId;
    document.getElementById('edit-s-type').value = serviceType;
    document.getElementById('edit-s-date').value = date;
    document.getElementById('edit-s-mileage').value = mileage;
    document.getElementById('edit-s-cost').value = cost;
    document.getElementById('edit-s-workshop').value = workshop || '';
    document.getElementById('edit-s-notes').value = notes || '';
    modalEditService.classList.remove('hidden');
  }

  formEditService.addEventListener('submit', async (e) => {
    e.preventDefault();
    const logId = document.getElementById('edit-log-id').value;
    const payload = {
      serviceTypeId: document.getElementById('edit-s-type').value,
      serviceDate: document.getElementById('edit-s-date').value,
      mileageAtService: document.getElementById('edit-s-mileage').value,
      costEur: document.getElementById('edit-s-cost').value,
      workshopName: document.getElementById('edit-s-workshop').value,
      notes: document.getElementById('edit-s-notes').value
    };
    try {
      const res = await fetch(`/api/v1/logs/${logId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error al guardar los cambios.');
      showToast('Registro de mantenimiento actualizado.', 'success');
      modalEditService.classList.add('hidden');
      await refreshAllData();
      // Rerender the logs tab if visible
      const activeTab = document.querySelector('.tab-content.active').id;
      if (activeTab === 'tab-logs') renderServicesTimeline();
    } catch (err) {
      showToast(err.message, 'danger');
    }
  });

  async function deleteServiceLog(logId) {
    const confirmed = confirm('⚠️ ¿Eliminar este registro de mantenimiento?\n\nEsta acción no se puede deshacer.');
    if (!confirmed) return;
    try {
      const res = await fetch(`/api/v1/logs/${logId}`, { method: 'DELETE' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error al eliminar el registro.');
      showToast('Registro eliminado correctamente.', 'success');
      await refreshAllData();
      renderServicesTimeline();
    } catch (err) {
      showToast(err.message, 'danger');
    }
  }

  // --- 8. Delete Vehicle ---
  async function deleteVehicle(vehicleId, vehicleName) {
    const confirmed = confirm(`⚠️ ¿Estás seguro de que quieres eliminar "${vehicleName}" y todos sus registros de mantenimiento?\n\nEsta acción no se puede deshacer.`);
    if (!confirmed) return;

    try {
      const res = await fetch(`/api/v1/vehicles/${vehicleId}`, { method: 'DELETE' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error al eliminar el vehículo.');

      showToast(`Vehículo "${vehicleName}" eliminado correctamente.`, 'success');
      await refreshAllData();
    } catch (err) {
      showToast(err.message, 'danger');
    }
  }

  // --- 8. Reset Database ---
  const btnResetDb = document.getElementById('btn-reset-database');
  if (btnResetDb) {
    btnResetDb.addEventListener('click', async () => {
      const confirmed = confirm('🚨 ATENCIÓN: ¿Estás seguro de que quieres BORRAR TODOS los vehículos y registros?\n\nEsta acción eliminará permanentemente toda la información del garaje y NO se puede deshacer.');
      if (!confirmed) return;

      const confirmed2 = confirm('Última confirmación: ¿Borrar TODA la base de datos del garaje?');
      if (!confirmed2) return;

      try {
        const res = await fetch('/api/v1/reset', {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ confirmPhrase: 'BORRAR_TODO' })
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Error al resetear la base de datos.');

        showToast('Base de datos borrada completamente. El garaje está vacío.', 'danger');
        await refreshAllData();
      } catch (err) {
        showToast(err.message, 'danger');
      }
    });
  }

  // --- 9. Exportación a PDF e Impresión ---
  function openPrintDocument(title, bodyContent) {
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      showToast('Ventana emergente bloqueada por el navegador. Permite ventanas emergentes para ver el PDF.', 'danger');
      return;
    }

    const html = `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700&display=swap" rel="stylesheet">
  <style>
    @page {
      size: A4 portrait;
      margin: 12mm 15mm;
    }
    * {
      box-sizing: border-box;
      font-family: 'Outfit', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    }
    body {
      margin: 0;
      padding: 0;
      color: #1e293b;
      background: #ffffff;
      font-size: 11px;
      line-height: 1.45;
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
    }
    .no-print {
      position: sticky;
      top: 0;
      background: #0f172a;
      color: white;
      padding: 10px 20px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      box-shadow: 0 4px 14px rgba(0,0,0,0.18);
      z-index: 9999;
    }
    .no-print button {
      cursor: pointer;
      font-size: 12px;
      font-weight: 600;
      border-radius: 6px;
      padding: 6px 14px;
      border: none;
    }
    .btn-print { background: #2563eb; color: white; }
    .btn-print:hover { background: #1d4ed8; }
    .btn-close { background: rgba(255,255,255,0.15); color: white; margin-left: 8px; }
    .btn-close:hover { background: rgba(255,255,255,0.25); }
    @media print {
      .no-print { display: none !important; }
      body { padding: 0; }
    }
    .report-wrap {
      max-width: 820px;
      margin: 0 auto;
      padding: 20px;
    }
    .report-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      border-bottom: 2px solid #2563eb;
      padding-bottom: 12px;
      margin-bottom: 16px;
    }
    .report-logo {
      font-size: 20px;
      font-weight: 700;
      color: #0f172a;
      display: flex;
      align-items: center;
      gap: 6px;
    }
    .report-subtitle {
      font-size: 11px;
      color: #64748b;
      margin-top: 3px;
    }
    .report-meta {
      text-align: right;
      font-size: 10px;
      color: #64748b;
    }
    .report-meta strong {
      display: block;
      color: #0f172a;
      font-size: 12px;
    }
    .section-title {
      font-size: 12px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      color: #0f172a;
      border-bottom: 1px solid #e2e8f0;
      padding-bottom: 4px;
      margin: 16px 0 8px 0;
      display: flex;
      align-items: center;
      gap: 6px;
    }
    .grid-4 {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 8px;
      margin-bottom: 12px;
    }
    .grid-3 {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 8px;
      margin-bottom: 12px;
    }
    .info-box {
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 6px;
      padding: 8px 10px;
    }
    .info-label {
      font-size: 9px;
      text-transform: uppercase;
      color: #64748b;
      font-weight: 600;
    }
    .info-val {
      font-size: 12px;
      font-weight: 700;
      color: #0f172a;
      margin-top: 2px;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 14px;
      font-size: 10.5px;
    }
    th, td {
      border: 1px solid #cbd5e1;
      padding: 6px 8px;
      text-align: left;
    }
    th {
      background-color: #f1f5f9;
      font-weight: 700;
      color: #334155;
      text-transform: uppercase;
      font-size: 9px;
      letter-spacing: 0.3px;
    }
    tr:nth-child(even) td {
      background-color: #f8fafc;
    }
    tr {
      page-break-inside: avoid;
    }
    .badge {
      display: inline-block;
      padding: 2px 6px;
      border-radius: 8px;
      font-size: 9px;
      font-weight: 700;
      text-transform: uppercase;
    }
    .badge-urgent { background: #fee2e2; color: #b91c1c; border: 1px solid #fca5a5; }
    .badge-warning { background: #fef3c7; color: #b45309; border: 1px solid #fde68a; }
    .badge-ok { background: #d1fae5; color: #047857; border: 1px solid #a7f3d0; }
    .footer-note {
      margin-top: 22px;
      border-top: 1px solid #e2e8f0;
      padding-top: 8px;
      display: flex;
      justify-content: space-between;
      font-size: 9.5px;
      color: #94a3b8;
    }
  </style>
</head>
<body>
  <div class="no-print">
    <div><strong>📄 AutoCare Garage</strong> &mdash; ${title}</div>
    <div>
      <button class="btn-print" onclick="window.print()">🖨️ Imprimir / Guardar como PDF</button>
      <button class="btn-close" onclick="window.close()">❌ Cerrar</button>
    </div>
  </div>
  <div class="report-wrap">
    ${bodyContent}
  </div>
</body>
</html>`;

    printWindow.document.open();
    printWindow.document.write(html);
    printWindow.document.close();
  }

  // Exportar ficha e historial de un vehículo a PDF
  async function exportVehiclePdf(vehicleId) {
    try {
      showToast('Generando dossier del vehículo...');
      const res = await fetch(`/api/v1/vehicles/${vehicleId}`);
      if (!res.ok) throw new Error('No se pudo obtener el detalle del vehículo.');
      const v = await res.json();

      const emitDate = new Date().toLocaleString('es-ES', { dateStyle: 'long', timeStyle: 'short' });
      const totalSpentFormatted = Number(v.totalSpentEur || 0).toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
      const icon = v.vehicleType === 'MOTO' ? '🏍️' : v.vehicleType === 'FURGONETA' ? '🚐' : '🏎️';

      // Tabla de Alertas
      const alertsRows = (v.alerts && v.alerts.length > 0)
        ? v.alerts.map(a => {
            let statusBadge = '<span class="badge badge-ok">✅ Al Día</span>';
            if (a.status === 'URGENT') statusBadge = '<span class="badge badge-urgent">🚨 Urgente</span>';
            else if (a.status === 'WARNING') statusBadge = '<span class="badge badge-warning">⚠️ Advertencia</span>';

            const lastDone = a.isCalendarBased
              ? `ITV Límite: ${a.itvExpirationDate || 'N/A'}`
              : (a.lastServiceKm ? `${a.lastServiceKm.toLocaleString()} km (${a.lastServiceDate || ''})` : 'Sin registros');

            const nextDue = a.isCalendarBased
              ? (a.daysRemaining !== null ? `${a.daysRemaining} días restantes` : 'N/A')
              : (a.nextDueKm ? `${a.nextDueKm.toLocaleString()} km (${a.remainingKm !== null ? a.remainingKm.toLocaleString() + ' km rest.' : ''})` : 'Por intervalo');

            const intervals = [
              a.intervalKm > 0 ? `${a.intervalKm.toLocaleString()} km` : null,
              a.intervalMonths > 0 ? `${a.intervalMonths} meses` : null
            ].filter(Boolean).join(' o ') || 'Manual';

            return `
              <tr>
                <td><strong>${a.serviceName}</strong></td>
                <td>${intervals}</td>
                <td>${lastDone}</td>
                <td>${nextDue}</td>
                <td style="text-align:center;">${statusBadge}</td>
              </tr>
            `;
          }).join('')
        : '<tr><td colspan="5" style="text-align:center; color:#64748b;">No hay alertas configuradas.</td></tr>';

      // Tabla de Historial
      const historyRows = (v.history && v.history.length > 0)
        ? v.history.map(h => `
            <tr>
              <td><strong>${h.serviceDate}</strong></td>
              <td>${Number(h.mileageAtService).toLocaleString()} km</td>
              <td>${h.serviceTypeName || h.serviceTypeId}</td>
              <td>${h.workshopName || 'Taller General'}</td>
              <td style="text-align:right; font-weight:600;">${Number(h.costEur || 0).toLocaleString('es-ES', { minimumFractionDigits: 2 })} €</td>
              <td>${h.notes || '-'}</td>
            </tr>
          `).join('')
        : '<tr><td colspan="6" style="text-align:center; color:#64748b; padding:12px;">No hay intervenciones registradas en el historial de este vehículo.</td></tr>';

      const bodyHtml = `
        <header class="report-header">
          <div class="report-brand">
            <div class="report-logo">🏎️ AutoCare Garage</div>
            <div class="report-subtitle">Dossier Técnico de Mantenimiento e Historial Mecánico</div>
          </div>
          <div class="report-meta">
            <strong>${v.brand} ${v.model} &mdash; ${v.licensePlate}</strong>
            <div>Fecha de emisión: ${emitDate}</div>
            <div>ID Vehículo: ${v.id}</div>
          </div>
        </header>

        <div class="section-title">🚘 Ficha Técnica del Vehículo</div>
        <div class="grid-4">
          <div class="info-box">
            <div class="info-label">Vehículo</div>
            <div class="info-val">${icon} ${v.brand} ${v.model}</div>
          </div>
          <div class="info-box">
            <div class="info-label">Matrícula / VIN</div>
            <div class="info-val">${v.licensePlate}</div>
          </div>
          <div class="info-box">
            <div class="info-label">Año / Tipo</div>
            <div class="info-val">${v.year} &bull; ${v.vehicleType}</div>
          </div>
          <div class="info-box">
            <div class="info-label">Combustible</div>
            <div class="info-val">${v.fuelType}</div>
          </div>
          <div class="info-box">
            <div class="info-label">Kilometraje Actual</div>
            <div class="info-val">${Number(v.currentMileage).toLocaleString()} km</div>
          </div>
          <div class="info-box">
            <div class="info-label">Próxima ITV</div>
            <div class="info-val">📅 ${v.itvExpirationDate || 'Sin definir'}</div>
          </div>
          <div class="info-box">
            <div class="info-label">Intervenciones</div>
            <div class="info-val">${v.history ? v.history.length : 0} servicios</div>
          </div>
          <div class="info-box">
            <div class="info-label">Inversión Total</div>
            <div class="info-val" style="color:#2563eb;">${totalSpentFormatted} €</div>
          </div>
        </div>

        <div class="section-title">🔔 Diagnóstico y Alertas de Mantenimiento Preventivo</div>
        <table>
          <thead>
            <tr>
              <th>Tipo de Servicio</th>
              <th>Intervalo Fabricante</th>
              <th>Última Intervención</th>
              <th>Próximo Vencimiento</th>
              <th style="text-align:center;">Estado</th>
            </tr>
          </thead>
          <tbody>
            ${alertsRows}
          </tbody>
        </table>

        <div class="section-title">🛠️ Historial Completo de Mantenimientos Realizados</div>
        <table>
          <thead>
            <tr>
              <th>Fecha</th>
              <th>Kilometraje</th>
              <th>Servicio</th>
              <th>Taller / Profesional</th>
              <th style="text-align:right;">Coste</th>
              <th>Observaciones</th>
            </tr>
          </thead>
          <tbody>
            ${historyRows}
          </tbody>
          <tfoot>
            <tr style="background:#f1f5f9; font-weight:700;">
              <td colspan="4" style="text-align:right;">TOTAL INVERTIDO EN MANTENIMIENTO:</td>
              <td style="text-align:right; color:#2563eb; font-size:12px;">${totalSpentFormatted} €</td>
              <td></td>
            </tr>
          </tfoot>
        </table>

        <div class="footer-note">
          <div>Documento generado por <strong>AutoCare Garage</strong> &bull; Bitácora local de mantenimiento.</div>
          <div>Página 1 de 1 &bull; ${v.licensePlate}</div>
        </div>
      `;

      openPrintDocument(`Informe_${v.licensePlate}_${v.brand}_${v.model}`, bodyHtml);

    } catch (err) {
      showToast(err.message, 'danger');
    }
  }

  // Obtiene todos los logs del garaje, con fallback transparente si el servidor aún no implementa /api/v1/logs
  async function fetchAllLogs(vehicles) {
    try {
      const res = await fetch('/api/v1/logs');
      const contentType = res.headers.get('content-type') || '';
      if (res.ok && contentType.includes('application/json')) {
        const data = await res.json();
        if (Array.isArray(data)) return data;
      }
    } catch (_) {
      // Continuar al fallback
    }

    // Fallback: consulta los servicios por cada vehículo de forma concurrente
    const targetVehicles = (vehicles && vehicles.length > 0) ? vehicles : (state.vehicles || []);
    if (targetVehicles.length === 0) return [];

    const logsPromises = targetVehicles.map(v =>
      fetch(`/api/v1/vehicles/${v.id}/services`)
        .then(r => r.json())
        .then(logs => (Array.isArray(logs) ? logs : []).map(l => ({
          ...l,
          vehicleId: v.id,
          brand: v.brand,
          model: v.model,
          licensePlate: v.licensePlate
        })))
        .catch(() => [])
    );

    const arrays = await Promise.all(logsPromises);
    return arrays.flat().sort((a, b) => new Date(b.serviceDate) - new Date(a.serviceDate));
  }

  // Exportar informe global del Garaje a PDF
  async function exportGaragePdf() {
    try {
      showToast('Generando informe global del garaje...');
      const [vRes, summaryRes] = await Promise.all([
        fetch('/api/v1/vehicles').then(r => r.json()),
        fetch('/api/v1/summary').then(r => r.json())
      ]);
      const logsRes = await fetchAllLogs(vRes);

      const emitDate = new Date().toLocaleString('es-ES', { dateStyle: 'long', timeStyle: 'short' });
      const totalSpent = Number(summaryRes.totalSpentEur || 0).toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

      // Tabla de vehículos
      const vehicleRows = (vRes && vRes.length > 0)
        ? vRes.map(v => {
            const icon = v.vehicleType === 'MOTO' ? '🏍️' : v.vehicleType === 'FURGONETA' ? '🚐' : '🏎️';
            const alertBadge = v.urgentAlertsCount > 0
              ? `<span class="badge badge-urgent">🚨 ${v.urgentAlertsCount} urgentes</span>`
              : (v.warningAlertsCount > 0 ? `<span class="badge badge-warning">⚠️ ${v.warningAlertsCount} avisos</span>` : '<span class="badge badge-ok">✅ Al Día</span>');

            return `
              <tr>
                <td><strong>${icon} ${v.brand} ${v.model}</strong> (${v.year})</td>
                <td><strong>${v.licensePlate}</strong></td>
                <td>${v.vehicleType} &bull; ${v.fuelType}</td>
                <td>${Number(v.currentMileage).toLocaleString()} km</td>
                <td>📅 ${v.itvExpirationDate || 'Sin definir'}</td>
                <td style="text-align:right; font-weight:600;">${Number(v.totalSpentEur || 0).toLocaleString('es-ES', { minimumFractionDigits: 2 })} €</td>
                <td style="text-align:center;">${alertBadge}</td>
              </tr>
            `;
          }).join('')
        : '<tr><td colspan="7" style="text-align:center; color:#64748b;">No hay vehículos registrados en el garaje.</td></tr>';

      // Tabla de últimos 15 servicios
      const recentLogs = logsRes.slice(0, 15);
      const recentLogRows = (recentLogs && recentLogs.length > 0)
        ? recentLogs.map(l => {
            const veh = vRes.find(v => v.id === l.vehicleId);
            const vehName = veh ? `${veh.brand} ${veh.model} (${veh.licensePlate})` : l.vehicleId;
            return `
              <tr>
                <td><strong>${l.serviceDate}</strong></td>
                <td>${vehName}</td>
                <td>${l.serviceTypeName || l.serviceTypeId}</td>
                <td>${Number(l.mileageAtService).toLocaleString()} km</td>
                <td>${l.workshopName || 'Taller General'}</td>
                <td style="text-align:right; font-weight:600;">${Number(l.costEur || 0).toLocaleString('es-ES', { minimumFractionDigits: 2 })} €</td>
              </tr>
            `;
          }).join('')
        : '<tr><td colspan="6" style="text-align:center; color:#64748b;">No hay servicios registrados en la bitácora.</td></tr>';

      const bodyHtml = `
        <header class="report-header">
          <div class="report-brand">
            <div class="report-logo">🏎️ AutoCare Garage</div>
            <div class="report-subtitle">Auditoría Global y Estado Consolidado del Garaje</div>
          </div>
          <div class="report-meta">
            <strong>Informe General del Parque Vehicular</strong>
            <div>Fecha de emisión: ${emitDate}</div>
            <div>Total Vehículos: ${summaryRes.vehiclesCount}</div>
          </div>
        </header>

        <div class="section-title">📊 Resumen Ejecutivo del Garaje</div>
        <div class="grid-4">
          <div class="info-box">
            <div class="info-label">Vehículos en Garaje</div>
            <div class="info-val">${summaryRes.vehiclesCount} vehículos</div>
          </div>
          <div class="info-box">
            <div class="info-label">Servicios Registrados</div>
            <div class="info-val">${summaryRes.totalServicesCount} servicios</div>
          </div>
          <div class="info-box">
            <div class="info-label">Inversión Consolidada</div>
            <div class="info-val" style="color:#2563eb;">${totalSpent} €</div>
          </div>
          <div class="info-box">
            <div class="info-label">Alertas Críticas Pendientes</div>
            <div class="info-val" style="color:${summaryRes.urgentAlertsCount > 0 ? '#b91c1c' : '#047857'};">
              ${summaryRes.urgentAlertsCount > 0 ? `🚨 ${summaryRes.urgentAlertsCount} urgentes` : '🟢 Todo al día'}
            </div>
          </div>
        </div>

        <div class="section-title">🚘 Parque de Vehículos Registrados</div>
        <table>
          <thead>
            <tr>
              <th>Vehículo</th>
              <th>Matrícula</th>
              <th>Tipo &bull; Combustible</th>
              <th>Km Actual</th>
              <th>Próxima ITV</th>
              <th style="text-align:right;">Gasto Total</th>
              <th style="text-align:center;">Estado Diagnóstico</th>
            </tr>
          </thead>
          <tbody>
            ${vehicleRows}
          </tbody>
          <tfoot>
            <tr style="background:#f1f5f9; font-weight:700;">
              <td colspan="5" style="text-align:right;">GASTO TOTAL DEL GARAJE:</td>
              <td style="text-align:right; color:#2563eb; font-size:12px;">${totalSpent} €</td>
              <td></td>
            </tr>
          </tfoot>
        </table>

        <div class="section-title">🛠️ Últimos Mantenimientos Realizados</div>
        <table>
          <thead>
            <tr>
              <th>Fecha</th>
              <th>Vehículo</th>
              <th>Servicio</th>
              <th>Kilometraje</th>
              <th>Taller</th>
              <th style="text-align:right;">Coste</th>
            </tr>
          </thead>
          <tbody>
            ${recentLogRows}
          </tbody>
        </table>

        <div class="footer-note">
          <div>Documento de auditoría generado automáticamente por <strong>AutoCare Garage</strong>.</div>
          <div>Base de datos SQLite local &bull; Confidencial</div>
        </div>
      `;

      openPrintDocument('Informe_General_Garaje', bodyHtml);

    } catch (err) {
      showToast(err.message, 'danger');
    }
  }

  // Exportar Bitácora de Servicios a PDF
  async function exportLogsPdf() {
    const selectedVId = selectLogVehicle.value;
    if (selectedVId) {
      return exportVehiclePdf(selectedVId);
    }

    try {
      showToast('Generando historial completo de servicios...');
      const vRes = (state.vehicles && state.vehicles.length > 0)
        ? state.vehicles
        : await fetch('/api/v1/vehicles').then(r => r.json());
      const logsRes = await fetchAllLogs(vRes);

      const emitDate = new Date().toLocaleString('es-ES', { dateStyle: 'long', timeStyle: 'short' });
      const totalCost = logsRes.reduce((sum, l) => sum + Number(l.costEur || 0), 0);
      const totalCostFormatted = totalCost.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

      const logRows = (logsRes && logsRes.length > 0)
        ? logsRes.map(l => {
            const veh = vRes.find(v => v.id === l.vehicleId);
            const vehName = veh ? `${veh.brand} ${veh.model} (${veh.licensePlate})` : l.vehicleId;
            return `
              <tr>
                <td><strong>${l.serviceDate}</strong></td>
                <td>${vehName}</td>
                <td>${l.serviceTypeName || l.serviceTypeId}</td>
                <td>${Number(l.mileageAtService).toLocaleString()} km</td>
                <td>${l.workshopName || 'Taller General'}</td>
                <td style="text-align:right; font-weight:600;">${Number(l.costEur || 0).toLocaleString('es-ES', { minimumFractionDigits: 2 })} €</td>
                <td>${l.notes || '-'}</td>
              </tr>
            `;
          }).join('')
        : '<tr><td colspan="7" style="text-align:center; color:#64748b; padding:12px;">No hay servicios registrados en la bitácora.</td></tr>';

      const bodyHtml = `
        <header class="report-header">
          <div class="report-brand">
            <div class="report-logo">🏎️ AutoCare Garage</div>
            <div class="report-subtitle">Bitácora Consolidada de Mantenimientos y Reparaciones</div>
          </div>
          <div class="report-meta">
            <strong>Historial Cronológico de Intervenciones</strong>
            <div>Fecha de emisión: ${emitDate}</div>
            <div>Total registros: ${logsRes.length}</div>
          </div>
        </header>

        <div class="section-title">🛠️ Detalle Cronológico de Intervenciones</div>
        <table>
          <thead>
            <tr>
              <th>Fecha</th>
              <th>Vehículo</th>
              <th>Servicio</th>
              <th>Kilometraje</th>
              <th>Taller / Profesional</th>
              <th style="text-align:right;">Coste</th>
              <th>Observaciones</th>
            </tr>
          </thead>
          <tbody>
            ${logRows}
          </tbody>
          <tfoot>
            <tr style="background:#f1f5f9; font-weight:700;">
              <td colspan="5" style="text-align:right;">COSTE TOTAL CONSOLIDADO:</td>
              <td style="text-align:right; color:#2563eb; font-size:12px;">${totalCostFormatted} €</td>
              <td></td>
            </tr>
          </tfoot>
        </table>

        <div class="footer-note">
          <div>Documento emitido por <strong>AutoCare Garage</strong> &bull; Control y gestión técnica de vehículos.</div>
          <div>Página 1 de 1</div>
        </div>
      `;

      openPrintDocument('Bitacora_Servicios_AutoCare', bodyHtml);

    } catch (err) {
      showToast(err.message, 'danger');
    }
  }

  // Bind export buttons in header and logs tab
  document.getElementById('btn-export-garage-pdf')?.addEventListener('click', exportGaragePdf);
  document.getElementById('btn-export-logs-pdf')?.addEventListener('click', exportLogsPdf);


  async function refreshAllData() {
    const [vRes, summaryRes] = await Promise.all([
      fetch('/api/v1/vehicles').then(r => r.json()),
      fetch('/api/v1/summary').then(r => r.json())
    ]);

    state.vehicles = vRes;
    state.summary = summaryRes;

    updateStatsBar();
    populateDropdowns();
    renderGarageGrid();
    
    // Refresh active tab views if visible
    const activeTab = document.querySelector('.tab-content.active').id;
    if (activeTab === 'tab-alerts') renderAlertsDashboard();
    if (activeTab === 'tab-logs') renderServicesTimeline();
  }

  // Toast Notification (supports 'success' and 'danger' types)
  function showToast(message, type = 'success') {
    toast.textContent = message;
    toast.classList.remove('hidden', 'toast-danger', 'toast-success');
    toast.classList.add(type === 'danger' ? 'toast-danger' : 'toast-success');
    setTimeout(() => toast.classList.add('hidden'), 4500);
  }

  // Init Application
  init();
});
