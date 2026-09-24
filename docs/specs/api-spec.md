# Especificación de API REST: AutoCare Garage

## 🔌 Base URL
`/api/v1`

---

## 📌 Endpoints

### 1. Vehículos (Garaje)

#### `GET /vehicles`
Obtiene la lista de todos los vehículos registrados en el garaje con sus métricas clave.
* **Respuesta (200 OK):**
```json
[
  {
    "id": "veh-101",
    "brand": "Volkswagen",
    "model": "Golf GTI",
    "year": 2021,
    "licensePlate": "1234-LMN",
    "currentMileage": 48500,
    "fuelType": "GASOLINA",
    "vehicleType": "COCHE",
    "totalSpentEur": 850.00,
    "urgentAlertsCount": 1
  }
]
```

#### `POST /vehicles`
Registra un nuevo vehículo en el garaje.
* **Request Body:**
```json
{
  "brand": "Yamaha",
  "model": "MT-07",
  "year": 2022,
  "licensePlate": "9988-KGB",
  "currentMileage": 14200,
  "fuelType": "GASOLINA",
  "vehicleType": "MOTO"
}
```

#### `GET /vehicles/{id}`
Obtiene los detalles completos de un vehículo específico, incluyendo su historial de mantenimientos y estado de alertas.

#### `PATCH /vehicles/{id}/mileage`
Actualiza el kilometraje actual de un vehículo.
* **Request Body:**
```json
{
  "currentMileage": 52000
}
```

---

### 2. Historial de Mantenimientos

#### `GET /vehicles/{id}/services`
Obtiene la bitácora de servicios realizados a un vehículo.

#### `POST /vehicles/{id}/services`
Registra un nuevo servicio de mantenimiento.
* **Request Body:**
```json
{
  "serviceTypeId": "OIL_CHANGE",
  "serviceDate": "2026-09-01",
  "mileageAtService": 48500,
  "costEur": 120.50,
  "workshopName": "Taller Oficial VW",
  "notes": "Cambio de aceite sintético 5W30 y filtro de aceite."
}
```

---

### 3. Alertas y Resumen Financiero

#### `GET /vehicles/{id}/alerts`
Obtiene el informe preventivo de alertas con kilómetros restantes para cada tipo de mantenimiento.
* **Respuesta (200 OK):**
```json
[
  {
    "serviceTypeId": "OIL_CHANGE",
    "serviceName": "Cambio de Aceite & Filtro",
    "lastServiceKm": 48500,
    "intervalKm": 10000,
    "nextDueKm": 58500,
    "remainingKm": 10000,
    "status": "OK"
  },
  {
    "serviceTypeId": "BRAKES",
    "serviceName": "Pastillas / Discos de Freno",
    "lastServiceKm": 20000,
    "intervalKm": 25000,
    "nextDueKm": 45000,
    "remainingKm": -3500,
    "status": "URGENT"
  }
]
```

#### `GET /summary`
Obtiene el resumen global del garaje (total invertido en mantenimientos, vehículo con más kilometraje, alertas urgentes activas).
