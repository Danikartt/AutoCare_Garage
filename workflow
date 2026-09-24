export const meta = {
    name: 'autocare-garage-development',
    description: 'Orquestación automática del desarrollo de AutoCare Garage (Gestor de Mantenimiento de Vehículos).',
    phases: [
        { title: 'Arquitectura' },
        { title: 'Desarrollo' },
        { title: 'Testing' },
        { title: 'Revisión Final' }
    ],
}

// Requerimientos del proyecto AutoCare Garage
const project_requirements = `
Requerimientos de AutoCare Garage (Gestor de Mantenimiento de Vehículos):
- Registro de Vehículos: Alta y gestión de coches/motos (Marca, Modelo, Año, Kilometraje Actual, Matrícula, Combustible).
- Bitácora de Mantenimiento: Registro de servicios realizados (Tipo de servicio: Cambio de Aceite, Filtros, Frenos, Correa de Distribución, Neumáticos, ITV/Inspección; Fecha; Kilometraje; Costo en €; Notas).
- Alertas Preventivas: Cálculo e indicador visual de mantenimientos requeridos según el kilometraje actual del vehículo o fecha estimada.
- Resumen Financiero: Estadísticas del costo total invertido en mantenimiento por vehículo.
- Interfaz Web: Dashboard moderno e interactivo para visualizar el garaje, añadir servicios y consultar alertas.
`;

const architecture_prompt = `Actúa como @software-architect. Diseña la estructura completa para AutoCare Garage considerando los siguientes requerimientos:
${project_requirements}

Debes generar y guardar los siguientes archivos en 'AutoCare_Garage/docs/specs/':
1) 'architecture.md': Descripción de arquitectura y diagramas de flujo en formato Mermaid.
2) 'schema.md': Esquema técnico de la base de datos (vehículos, servicios, tipos de mantenimiento, alertas).
3) 'api-spec.md': Definición técnica de endpoints, métodos y contratos de API REST.
Tu objetivo es crear un plano robusto que permita al desarrollador construir sin ambigüedades.`;

const development_prompt = `Actúa como @developer. Basándote en los planos guardados en 'AutoCare_Garage/docs/specs/' (esquema de DB, flujos y APIs), implementa el código fuente de producción dentro de la carpeta 'AutoCare_Garage/src/' y la interfaz web interactiva en 'AutoCare_Garage/public/'.
Asegúrate de que el código sea modular, limpio, seguro y que incluya servidor Express y frontend cliente responsive.`;

const testing_prompt = `Actúa como @tester. Detecta el entorno en 'AutoCare_Garage/', crea los test suites en 'AutoCare_Garage/tests/' y somete el servicio de mantenimiento y alertas a pruebas unitarias y de integración.
Guarda el reporte de resultados en 'AutoCare_Garage/docs/reports/test_report.md'.`;

const review_prompt = `Actúa como @code-reviewer. Realiza una auditoría final revisando los cambios en 'AutoCare_Garage/' mediante lectura de código y verificación de artefactos.
Verifica seguridad, calidad y alineación con los requerimientos originales del arquitecto. Guarda los hallazgos en 'AutoCare_Garage/docs/reports/review_log.md'.`;

export async function run() {
    await pipeline(
        [
            { prompt: architecture_prompt, label: 'arch', phase: 'Arquitectura', agent: 'software-architect' },
            { prompt: development_prompt, label: 'dev', phase: 'Desarrollo', agent: 'developer' },
            { prompt: testing_prompt, label: 'test', phase: 'Testing', agent: 'tester' },
            { prompt: review_prompt, label: 'review', phase: 'Revisión Final', agent: 'code-reviewer' }
        ],
        (step) => agent(step.prompt, { label: step.label, phase: step.phase, subagent: step.agent })
    );
}
