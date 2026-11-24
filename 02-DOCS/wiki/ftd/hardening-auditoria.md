---
author: Danikartt
branch: main
status: in-progress
---
# Hardening tras auditoría de AutoCare Garage

## Intent

Corregir los cuatro hallazgos de la auditoría de estado: validación numérica incompleta, generación de IDs con `Date.now()`, inyección de HTML sin escapar en el cliente y falta de cobertura de tests en rutas HTTP y edición/borrado de servicios.

## Scope

- **Incluye**: `src/services/maintenanceService.js`, `src/server.js`, `public/app.js`, `tests/maintenance.test.js`.
- **Excluye**: cambios de esquema SQLite, rediseño visual o nuevas funcionalidades de producto.

## Checklist

- [x] Validar `year`, `currentMileage`, `mileageAtService` y `costEur` (no `NaN`, no negativos, `year` entero válido) en `MaintenanceService` — prueba: test 9 (`npm test`).
- [x] Sustituir `veh-${Date.now()}` y `log-${Date.now()}` por `crypto.randomUUID()` en `MaintenanceService` — prueba: test 10 (`npm test`).
- [x] Añadir `escapeHtml` en `public/app.js` y aplicarlo en interpolaciones de `innerHTML` y plantillas HTML — prueba: `node --check public/app.js` y revisión de `public/app.js`.
- [x] Ampliar `tests/maintenance.test.js` con tests de `updateServiceLog`, `deleteServiceLog`, entradas inválidas y endpoints HTTP de `src/server.js` — prueba: `npm test` (12/12 en verde).

## Evidence

- `npm test`: `12/12` pruebas pasadas (`pass 12`, `fail 0`, ~415 ms).
- `node --check public/app.js`: código de salida `0`.
- `npx -y @ericrisco/rsc@4.1.10 risk`: `tier 1` (`default`: `public/app.js`, `src/server.js`, `src/services/maintenanceService.js`, `tests/maintenance.test.js`).

## Next

Hacer commit de los cambios en `main` si el usuario lo confirma.
