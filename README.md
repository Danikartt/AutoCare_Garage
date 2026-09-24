# 🚗 AutoCare Garage

**AutoCare Garage** es una aplicación web full-stack para la gestión integral de mantenimiento de vehículos y bitácora de garaje. Permite a los propietarios llevar un control detallado del historial de revisiones, monitorear costos, recibir alertas preventivas según kilometraje o tiempo y gestionar el vencimiento de la ITV.

---

## 🌟 Características Principales

- 🚙 **Gestión de Vehículos**: Alta y administración de turismos y motocicletas (marca, modelo, año, kilometraje actual, matrícula/VIN y tipo de combustible).
- 🛠️ **Bitácora de Mantenimiento**: Registro de servicios preventivos y correctivos (cambio de aceite, filtro de habitáculo, filtro de aire, filtro de combustible, frenos, ITV, reparaciones en "Otros Servicios", etc.) detallando fecha, kilometraje, costo en €, taller y observaciones.
- 🔔 **Sistema de Alertas Preventivas**: Algoritmo predictivo e indicador visual de intervenciones requeridas basándose en intervalos estándar de fabricante por kilometraje o fecha límite de ITV.
- 📊 **Resumen y Financiero**: Dashboard interactivo con métricas del garaje, costo total invertido por vehículo y alertas pendientes.
- 🔒 **Privacidad de Datos**: Base de datos SQLite local configurada en `.gitignore` para no subir información ni vehículos personales a repositorios públicos de Git/GitHub.
- 💻 **Interfaz Web Moderna**: Cliente web dinámico, rápido y responsive construido con HTML5, CSS3 vanilla y JavaScript Async/Await.

---

## ⏱️ Intervalos de Mantenimiento Configurados

El sistema evalúa el kilometraje actual y el historial registrado para generar alertas automáticas:

| Tipo de Servicio | Intervalo Estándar | Categoría |
| :--- | :--- | :--- |
| **Cambio de Aceite & Filtro** | `15.000 km` | Motor |
| **Filtro de Habitáculo (Polen)** | `15.000 km` | Motor |
| **Filtro de Aire del Motor** | `20.000 km` | Motor |
| **Filtro de Combustible** | `40.000 km` | Motor |
| **Pastillas / Discos de Freno** | `25.000 km` | Seguridad |
| **Inspección Técnica (ITV)** | Basado en Fecha Límite | Documentación |
| **Otros Servicios (Cadenas/Correas/Reparaciones)** | Personalizado / Manual | General |

---

## 🏗️ Arquitectura del Proyecto

```text
AutoCare_Garage/
├── .gitignore             # Archivos excluidos de Git (node_modules, data/*.db, *.log)
├── data/                  # Base de datos (autocare_garage.db) y log de auditoría (activity.log)
├── docs/                  # Documentación técnica y especificaciones
│   ├── specs/             # Especificaciones de arquitectura, DB y API
│   └── reports/           # Reportes de pruebas y revisiones de código
├── public/                # Frontend cliente (HTML, CSS, JS estáticos)
│   ├── index.html
│   ├── style.css
│   └── app.js
├── src/                   # Código fuente Backend (Node.js + Express)
│   ├── data/              # Configuración e inicialización de SQLite
│   ├── services/          # Lógica de negocio (MaintenanceService)
│   ├── utils/             # Utilidades del sistema (logger.js)
│   └── server.js          # Servidor HTTP y definición de endpoints REST
├── tests/                 # Pruebas unitarias e integración (Node Test Runner)
├── package.json           # Dependencias y scripts del proyecto
└── README.md
```

---

## ⚙️ Tecnologías Utilizadas

- **Backend**: Node.js, Express.js 5
- **Base de Datos**: SQLite (`sqlite3`)
- **Frontend**: HTML5, CSS3 Vanilla, JavaScript (ES Modules)
- **Testing**: Node.js Native Test Runner (`node --test`)

---

## 🚀 Instalación y Ejecución

### Prerrequisitos

- Node.js (v18 o superior recomendado)
- npm

### 1. Clonar / Descargar el proyecto e instalar dependencias

```bash
cd AutoCare_Garage
npm install
```

### 2. Iniciar el servidor

```bash
npm start
```

El servidor se iniciará en `http://localhost:3001`. Puedes abrir esa dirección en tu navegador para interactuar con la aplicación.

### 3. Ejecutar Pruebas (Tests)

```bash
npm test
```

---

## 🔌 API REST (Endpoints principales)

| Método | Endpoint | Descripción |
| :--- | :--- | :--- |
| `GET` | `/api/v1/summary` | Obtiene el resumen global del garaje (totales, gastos, alertas) |
| `GET` | `/api/v1/vehicles` | Lista todos los vehículos registrados |
| `POST` | `/api/v1/vehicles` | Registra un nuevo vehículo |
| `GET` | `/api/v1/vehicles/:id` | Obtiene el detalle de un vehículo específico |
| `PATCH` | `/api/v1/vehicles/:id/mileage` | Actualiza el kilometraje actual de un vehículo |
| `PATCH` | `/api/v1/vehicles/:id/itv` | Actualiza la fecha de vencimiento de la ITV |
| `GET` | `/api/v1/vehicles/:id/services` | Consulta la bitácora de mantenimientos de un vehículo |
| `POST` | `/api/v1/vehicles/:id/services` | Registra un nuevo servicio o mantenimiento |
| `GET` | `/api/v1/vehicles/:id/alerts` | Obtiene las alertas activas de un vehículo |
| `GET` | `/api/v1/service-types` | Lista los tipos de servicios de mantenimiento configurados |
| `GET` | `/api/v1/activity-logs` | Consulta el historial de actividad y cambios en los vehículos |

---

## 📄 Licencia

Este proyecto cuenta con licencia [ISC](LICENSE).
