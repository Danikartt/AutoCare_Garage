# Reporte de Pruebas Automatizadas: AutoCare Garage

## 🧪 Resumen de Ejecución
- **Framework de Pruebas:** Node.js Native Test Runner (`node --test`)
- **Total de Pruebas:** 5
- **Exitosas (PASSED):** 5 (100%)
- **Fallidas (FAILED):** 0
- **Tiempo de Ejecución:** ~87 ms

---

## 📋 Escenarios Validados

| ID | Escenario | Resultado | Detalles |
| :- | :--- | :--- | :--- |
| **TEST-01** | Catálogo de Mantenimientos | `PASSED` | Carga de intervalos recomendados (Aceite 10k, Frenos 25k, Distribución 80k). |
| **TEST-02** | Registro de Vehículo y Matrícula Única | `PASSED` | Alta exitosa y prevención de duplicados (`409 Conflict`). |
| **TEST-03** | Registro de Servicio y Auto-actualización de Km | `PASSED` | Al registrar servicio con mayor kilometraje, se actualiza el cuentakilómetros del vehículo. |
| **TEST-04** | Evaluación de Alertas Preventivas | `PASSED` | Clasificación correcta de estado `URGENT` al superar el kilometraje límite. |
| **TEST-05** | Resumen Financiero y Estadísticas | `PASSED` | Cálculo exacto del total invertido en euros (€) y recuento de alertas rojas. |

---

## ✅ Conclusión de QA
El motor de cálculo de kilometraje y diagnóstico preventivo funciona de manera óptima y cumple al 100% con los requerimientos.
