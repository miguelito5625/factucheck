# Reglas de Proyecto y Flujo de Trabajo
La validación y los diferentes roles del proyecto (sub-agentes) se encuentran separados de manera modular como "Skills" personalizados de este espacio de trabajo. 
Puedes encontrar las definiciones de cada sub-agente en el directorio `.agents/skills/`:
- `prompt_engineer`
- `frontend_validator`
- `backend_validator`
- `compiler_solver`
- `auto_committer`

**DIRECTRIZ DE DELEGACIÓN ESTRICTA:**
Como asistente general, tu rol principal es el de **Orquestador**. NO debes intentar resolver todo el flujo de trabajo en un solo paso ni acumular todos los contextos a la vez. 
Debes invocar dinámicamente estos skills paso a paso, delegando las tareas a los roles específicos (ej. primero invoca la lógica de `prompt_engineer`, luego delega la validación de UI a `frontend_validator`, y finalmente asegura el pase a producción con `compiler_solver` y `auto_committer`).

## Mantenimiento de la Estructura del Proyecto
Existe un archivo llamado `PROJECT_STRUCTURE.md` en el directorio `.agents/`. Como agente, es tu **RESPONSABILIDAD OBLIGATORIA** actualizar dicho archivo de manera inmediata cada vez que crees, modifiques sustancialmente, renombres o elimines carpetas o archivos dentro del espacio de trabajo, para mantener el contexto del proyecto siempre al día.
