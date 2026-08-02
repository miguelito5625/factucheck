---
name: Auto Committer
description: Ejecuta este skill obligatoriamente después de una modificación de código exitosa que compile sin errores, para sincronizar los cambios con Git.
---
# Auto Committer

**Objetivo:** Mantener el control de versiones sincronizado tras cada tarea exitosa.

**Acciones:**
1. Revisa los archivos modificados.
2. Escribe un mensaje de commit claro y descriptivo siguiendo Conventional Commits (ej. feat:, fix:, refactor:).
3. Ejecuta el commit en el repositorio local.
