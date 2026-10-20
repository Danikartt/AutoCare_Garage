# FTD: Exportación a PDF de Informes de Mantenimiento

## 1. Intención (Intent)
Proporcionar a los usuarios de AutoCare Garage la capacidad de generar y descargar/imprimir informes técnicos en formato PDF, tanto individuales por vehículo (dossier de revisiones para ITV, venta o taller) como el informe global del garaje.

## 2. Alcance (Scope)
- **Informe de Vehículo individual**:
  - Datos de identificación (marca, modelo, año, matrícula, combustible, tipo, km actuales, próxima ITV).
  - Resumen financiero del vehículo (gasto acumulado, número de intervenciones).
  - Estado del diagnóstico preventivo (alertas activas por km y tiempo con códigos visuales).
  - Historial detallado de servicios (fecha, kilometraje, tipo de servicio, taller, coste y notas).
- **Informe Global del Garaje**:
  - Métricas totales del garaje (vehículos, servicios, gasto consolidado, alertas pendientes).
  - Listado de vehículos con su estado de alertas y última revisión.
- **Formato y Diseño**:
  - Plantilla limpia y profesional para automoción en formato A4 con `@media print`.
  - Disparador directo a ventana de impresión nativa ("Guardar como PDF").
  - Cero dependencias binarias pesadas externas.

## 3. Checklist de Tareas
- [x] 1. Definir estilos CSS de impresión (`@media print`) en `public/style.css` o plantilla imprimible.
- [x] 2. Integrar botón "📄 Exportar PDF" en cada tarjeta de vehículo dentro de `public/app.js`.
- [x] 3. Integrar botón "📄 Informe Garaje (PDF)" en la barra superior de `public/index.html`.
- [x] 4. Implementar generador de plantilla HTML imprimible para vehículo individual en `public/app.js`.
- [x] 5. Implementar generador de plantilla HTML imprimible para el resumen global en `public/app.js`.
- [x] 6. Verificar y validar que no rompe la UI existente ni los tests automatizados.

## 4. Evidencia (Evidence)
- Verificación sintáctica con `node --check public/app.js` exitosa (código de salida 0).
- Suite de tests `npm test` pasando al 100% (7/7 tests en verde en ~35ms).
- Botones integrados en tarjetas de vehículo (`.btn-export-vehicle-pdf`), barra del garaje (`#btn-export-garage-pdf`) y bitácora (`#btn-export-logs-pdf`).
- Plantilla A4 completa con ficha técnica, resumen de inversión, matriz de diagnóstico preventivo con distintivos por color y desglose de intervenciones.

## 5. Próximo Paso (Next Step)
Presentar el resultado al usuario y verificar si desea probar la previsualización/impresión o continuar con la siguiente mejora (búsqueda/filtros o exportación CSV).
