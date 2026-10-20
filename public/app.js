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
            <button class="btn btn-danger btn-sm btn-delete-vehicle" data-v-id="${v.id}" data-v-name="${v.brand} ${v.model}">🗑️ Eliminar</button>
          </div>
        </div>
      `;
    }).join('');

    // Handlers for mileage, ITV date, quick service, and delete
    document.querySelectorAll('.btn-update-mileage').forEach(btn => {
      btn.addEventListener('click', () => openUpdateMileageModal(btn.getAttribute('data-v-id')));
    });

    document.querySelectorAll('.btn-update-itv').forEach(btn => {
      btn.addEventListener('click', () => openUpdateItvModal(btn.getAttribute('data-v-id')));
    });

    document.querySelectorAll('.btn-quick-service').forEach(btn => {
      btn.addEventListener('click', () => openAddServiceModal(btn.getAttribute('data-v-id')));
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
