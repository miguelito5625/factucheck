# Contexto del Proyecto: FactuCheck

## Estado Actual
- **Backend**: Implementado en Go. Proporciona APIs para extracción de texto (heurísticas), creación/edición de reglas (proveedores) y validación masiva/estricta de documentos PDF de facturas.
- **Frontend**: Aplicación SPA utilizando Vanilla JS (`app.js`) y Materialize CSS, con iconos Material Symbols.
- **Base de Datos**: Las configuraciones de reglas se almacenan de manera persistente en `reglas.json`.

## Actualizaciones Recientes
- **Identificadores en Constructor de Reglas (UI)**: Se ha implementado un checkbox interactivo para cada regla en la interfaz del Constructor de Reglas. Esto permite al usuario seleccionar qué campos actuarán como "identificadores" (`isIdentifier: true`) directamente desde la lista de reglas sugeridas o creadas. Estos identificadores se utilizan en el backend (`/api/identify-provider`) para autodetectar a qué regla pertenece una factura sin intervención manual.
- **Visualización en Mis Reglas (UI)**: Ahora se muestra de forma explícita qué campos de una regla son identificadores en la vista de "Mis Reglas" mediante un icono de llave (`key`).
- **Mejora Heurística de Extracción (Backend)**: Se ha corregido la lógica de la función `AnalyzeHeuristics` para evitar que campos sugeridos inteligentes arrastren el texto no estructurado del resto del documento PDF cuando el campo ya tiene un valor asignado.
- **Portabilidad del Binario (Backend)**: Se actualizó `main.go` para utilizar el paquete `embed` y `io/fs` de Go, incrustando los recursos estáticos del directorio `public` (HTML, CSS y JS) directamente dentro del ejecutable. Ahora el archivo `factucheck.exe` es 100% portable y puede moverse y ejecutarse desde cualquier ubicación sin arrojar errores "404 page not found".
- **Integración Tipo de Cambio Banguat (Fullstack)**: Se implementó un nuevo servicio (`internal/services/banguat.go`) que consulta mediante SOAP el tipo de cambio oficial del Banco de Guatemala para el último día del mes anterior. Esta información se expone mediante `/api/exchange-rate`. Las reglas ahora soportan una bandera `isExchangeRate: true` desde el UI (`crear.html` y `app.js`). Durante el inicio del servidor, todos los proveedores actualizan automáticamente sus valores de referencia del tipo de cambio Banguat, permitiendo una validación totalmente desatendida.
