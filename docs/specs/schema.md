# Esquema de Base de Datos: AutoCare Garage

## 💾 Modelo Relacional

### 1. Tabla: `vehicles` (Garaje de Vehículos)

| Campo | Tipo | Restricciones | Descripción |
| :--- | :--- | :--- | :--- |
| `id` | `VARCHAR(36)` | PRIMARY KEY | Identificador del vehículo |
| `brand` | `VARCHAR(50)` | NOT NULL | Marca (ej: Toyota, BMW, Honda, Yamaha) |
| `model` | `VARCHAR(50)` | NOT NULL | Modelo (ej: Corolla, Serie 3, Civic, MT-07) |
| `year` | `INTEGER` | NOT NULL | Año de fabricación |
| `license_plate` | `VARCHAR(20)` | NOT NULL, UNIQUE | Matrícula / Patente |
| `current_mileage` | `INTEGER` | NOT NULL | Kilometraje actual registrado |
| `fuel_type` | `VARCHAR(20)` | NOT NULL | `GASOLINA`, `DIESEL`, `HIBRIDO`, `ELECTRICO` |
| `vehicle_type` | `VARCHAR(20)` | NOT NULL | `COCHE`, `MOTO`, `FURGONETA` |
| `created_at` | `TIMESTAMP` | NOT NULL | Fecha de alta |

---

### 2. Tabla: `service_types` (Tipos de Mantenimiento)

| Campo | Tipo | Restricciones | Descripción |
| :--- | :--- | :--- | :--- |
| `id` | `VARCHAR(30)` | PRIMARY KEY | Identificador (ej: `OIL_CHANGE`, `BRAKES`) |
| `name` | `VARCHAR(100)` | NOT NULL | Nombre legible del servicio |
| `interval_km` | `INTEGER` | NOT NULL | Intervalo recomendado en kilómetros |
| `category` | `VARCHAR(30)` | NOT NULL | `MOTOR`, `SEGURIDAD`, `DOCUMENTACION`, `GENERAL` |

---

### 3. Tabla: `maintenance_logs` (Bitácora de Servicios)

| Campo | Tipo | Restricciones | Descripción |
| :--- | :--- | :--- | :--- |
| `id` | `VARCHAR(36)` | PRIMARY KEY | Identificador del registro de servicio |
| `vehicle_id` | `VARCHAR(36)` | FOREIGN KEY (`vehicles.id`) | Vehículo al que corresponde |
| `service_type_id` | `VARCHAR(30)` | FOREIGN KEY (`service_types.id`) | Tipo de servicio realizado |
| `service_date` | `DATE` | NOT NULL | Fecha en que se realizó el mantenimiento |
| `mileage_at_service` | `INTEGER` | NOT NULL | Kilometraje que tenía el vehículo al hacer el servicio |
| `cost_eur` | `DECIMAL(10,2)` | NOT NULL | Costo en Euros (€) |
| `workshop_name` | `VARCHAR(100)` | NULL | Nombre del taller o "Propio" |
| `notes` | `TEXT` | NULL | Observaciones adicionales o piezas cambiadas |
| `created_at` | `TIMESTAMP` | NOT NULL | Fecha de registro en sistema |

---

### 4. Vista / Estructura Calculada: `maintenance_alerts`

| Campo | Tipo | Descripción |
| :--- | :--- | :--- |
| `vehicle_id` | `VARCHAR(36)` | Vehículo evaluado |
| `service_type_id` | `VARCHAR(30)` | Tipo de servicio |
| `last_service_km` | `INTEGER` | Último km en que se realizó |
| `next_due_km` | `INTEGER` | Próximo km en que corresponde |
| `remaining_km` | `INTEGER` | Kilómetros faltantes (negativo si está vencido) |
| `status` | `VARCHAR(20)` | `OK` (Verde), `WARNING` (Amarillo), `URGENT` (Rojo) |
