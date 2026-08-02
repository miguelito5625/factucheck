# Contexto del Proyecto: FactuCheck

Este documento refleja el estado actual del proyecto y sirve como referencia principal para el desarrollo continuo. **Debe ser actualizado cada vez que se agreguen nuevas funciones o se realicen ajustes significativos en la arquitectura.**

## Descripción General
FactuCheck es un proyecto que ha sido migrado de Node.js a Go. Su objetivo principal es el procesamiento, validación y verificación de facturas.

## Estructura del Proyecto
El proyecto utiliza una estructura estándar para aplicaciones en Go:
- `main.go`: Archivo en la raíz que sirve como punto de entrada principal de la aplicación.
- `/internal/`: Código privado de la aplicación, lógica de negocio y paquetes internos.
- `/public/`: Archivos estáticos, vistas o frontend (utilizando componentes o integraciones visuales).
- `reglas.json`: Archivo de persistencia de las reglas de proveedores, autogenerado y almacenado en la misma ruta del ejecutable.
- `.agents/`: Reglas y configuraciones para mantener el comportamiento coherente en el desarrollo.

## Estado Actual y Funciones Principales
- **Inicialización**: El entorno base de Go fue configurado (`go.mod`, `go.sum`) y estructurado.
- *(Nota: Agregar aquí las nuevas rutas, controladores, modelos y lógicas conforme se desarrollen).*
