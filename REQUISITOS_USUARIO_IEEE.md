# ESPECIFICACIÓN DE REQUISITOS DE SOFTWARE (SRS)
## Sistema Didi Sicuani

**Versión:** 1.0  
**Fecha:** 2024  
**Formato:** IEEE 830-1998

---

## 1. INTRODUCCIÓN

### 1.1 Propósito

Este documento especifica los requisitos funcionales y no funcionales del sistema Didi Sicuani, una plataforma de solicitud de viajes que permite a los clientes solicitar servicios de transporte y a los conductores ofrecer precios competitivos en tiempo real mediante un sistema de subastas.

### 1.2 Alcance

El sistema Didi Sicuani es una aplicación web y móvil que conecta pasajeros con conductores de taxi y mototaxi en la ciudad de Sicuani. El sistema permite:

- Solicitud de viajes por parte de clientes
- Recepción de solicitudes en tiempo real por parte de conductores
- Sistema de ofertas de precios competitivas
- Visualización de ofertas en tiempo real para clientes y conductores
- Notificaciones de aceptación o rechazo de solicitudes
- Gestión de timeouts automáticos

### 1.3 Definiciones, Acrónimos y Abreviaciones

- **SRS**: Software Requirements Specification (Especificación de Requisitos de Software)
- **Bid**: Oferta de precio realizada por un conductor
- **Ride Request**: Solicitud de viaje realizada por un cliente
- **Socket.io**: Biblioteca para comunicación en tiempo real
- **Timeout**: Tiempo límite para una operación

### 1.4 Referencias

- IEEE Std 830-1998: Recommended Practice for Software Requirements Specifications
- IEEE Std 1016-2009: Recommended Practice for Software Design Descriptions

### 1.5 Visión General

Este documento está organizado en las siguientes secciones:
- Sección 2: Descripción General
- Sección 3: Requisitos Funcionales
- Sección 4: Requisitos No Funcionales
- Sección 5: Casos de Uso

---

## 2. DESCRIPCIÓN GENERAL

### 2.1 Perspectiva del Producto

El sistema Didi Sicuani es un sistema independiente que opera como intermediario entre clientes que necesitan transporte y conductores disponibles. El sistema no requiere integración con sistemas externos para su funcionamiento básico.

### 2.2 Funciones del Producto

Las principales funciones del sistema incluyen:

1. **Gestión de Solicitudes de Viaje**: Los clientes pueden crear solicitudes de viaje especificando origen, destino.

2. **Sistema de Notificaciones en Tiempo Real**: Los conductores reciben notificaciones instantáneas cuando se crea una nueva solicitud de viaje.

3. **Sistema de Ofertas (Bidding)**: Los conductores pueden realizar ofertas de precio para las solicitudes de viaje.

4. **Visualización de Ofertas**: Tanto clientes como conductores pueden ver todas las ofertas realizadas en tiempo real.

5. **Gestión de Respuestas**: El sistema gestiona las respuestas de aceptación o rechazo de solicitudes y notifica a las partes involucradas.

6. **Gestión de Timeouts**: El sistema cancela automáticamente las solicitudes que no reciben respuesta del cliente dentro del tiempo límite establecido.

### 2.3 Características del Usuario

El sistema está diseñado para tres tipos de usuarios:

1. **Cliente/Pasajero**: Usuario que solicita servicios de transporte.
2. **Conductor**: Usuario que proporciona servicios de transporte (taxi o mototaxi).
3. **Administrador**: Usuario que gestiona y monitorea el sistema.

### 2.4 Restricciones

- **Restricción Geográfica**: El sistema no considera datos geográficos para filtrar conductores. Todos los conductores disponibles reciben todas las solicitudes.
- **Restricción de Tiempo**: El tiempo de espera para la respuesta del cliente es de 5 minutos. Si el cliente no responde, la solicitud se cancela automáticamente.
- **Restricción de Conectividad**: El sistema requiere conexión a Internet para funcionar.

### 2.5 Supuestos y Dependencias

- Los usuarios tienen acceso a dispositivos con conexión a Internet.
- Los usuarios están autenticados en el sistema antes de realizar operaciones.
- El sistema utiliza WebSockets (Socket.io) para comunicación en tiempo real.
- El sistema utiliza MongoDB como base de datos principal.

---

## 3. REQUISITOS FUNCIONALES

### 3.1 RF-001: Crear Solicitud de Viaje

**Prioridad:** Alta  
**Descripción:** El sistema debe permitir a un cliente crear una solicitud de viaje.

**Entradas:**
- Origen (dirección y coordenadas)
- Destino (dirección y coordenadas)

**Procesamiento:**
1. El sistema valida que las coordenadas de origen y destino sean válidas.
2. El sistema calcula la distancia y duración estimada del viaje.
3. El sistema crea la solicitud con estado "bidding_active".
4. El sistema programa un timeout de 5 minutos.

**Salidas:**
- Confirmación de creación de solicitud
- ID de solicitud de viaje
- Estado de la solicitud

**Postcondiciones:**
- La solicitud queda registrada en el sistema.
- Todos los conductores disponibles reciben notificación de la nueva solicitud.

---

### 3.2 RF-002: Notificar Solicitudes a Conductores

**Prioridad:** Alta  
**Descripción:** El sistema debe notificar a todos los conductores disponibles cuando se crea una nueva solicitud de viaje.

**Entradas:**
- Solicitud de viaje creada

**Procesamiento:**
1. El sistema identifica todos los conductores disponibles (online y disponibles).
2. El sistema envía notificación vía Socket.io a todos los conductores disponibles.

**Salidas:**
- Notificación en tiempo real a conductores
- Información de la solicitud (origen, destino)

**Postcondiciones:**
- Todos los conductores disponibles han recibido la notificación.
- Los conductores pueden ver la solicitud en su interfaz.

---

### 3.3 RF-003: Realizar Oferta de Precio

**Prioridad:** Alta  
**Descripción:** El sistema debe permitir a un conductor realizar una oferta de precio para una solicitud de viaje.

**Entradas:**
- ID de solicitud de viaje
- ID de conductor
- Precio ofrecido por el conductor

**Procesamiento:**
1. El sistema valida que la solicitud esté en estado "bidding_active".
2. El sistema valida que el conductor esté disponible y online.
3. El sistema valida que no haya expirado el tiempo límite para ofertar.
4. El sistema valida que el precio ofrecido sea válido (mayor a cero).
5. El sistema crea la oferta (bid) con estado "pending".
6. El sistema notifica al cliente sobre la nueva oferta.
7. El sistema notifica a otros conductores sobre la nueva oferta.

**Salidas:**
- Confirmación de oferta creada
- ID de oferta
- Notificación al cliente
- Notificación a otros conductores

**Postcondiciones:**
- La oferta queda registrada en el sistema.
- El cliente puede ver la nueva oferta.
- Otros conductores pueden ver la nueva oferta.

---

### 3.4 RF-004: Visualizar Ofertas en Tiempo Real (Cliente)

**Prioridad:** Alta  
**Descripción:** El sistema debe permitir a un cliente visualizar todas las ofertas recibidas para su solicitud de viaje en tiempo real.

**Entradas:**
- ID de solicitud de viaje
- ID de cliente

**Procesamiento:**
1. El sistema valida que el cliente sea el propietario de la solicitud.
2. El sistema obtiene todas las ofertas asociadas a la solicitud.
3. El sistema actualiza la lista de ofertas en tiempo real mediante Socket.io.

**Salidas:**
- Lista de ofertas con información del conductor (nombre, rating, precio ofrecido, tipo de vehículo)
- Actualizaciones en tiempo real cuando se reciben nuevas ofertas

**Postcondiciones:**
- El cliente puede ver todas las ofertas actualizadas.

---

### 3.5 RF-005: Visualizar Ofertas de Otros Conductores

**Prioridad:** Alta  
**Descripción:** El sistema debe permitir a los conductores visualizar las ofertas realizadas por otros conductores para la misma solicitud de viaje.

**Entradas:**
- ID de solicitud de viaje
- ID de conductor

**Procesamiento:**
1. El sistema valida que el conductor esté autenticado.
2. El sistema obtiene todas las ofertas asociadas a la solicitud.
3. El sistema actualiza la lista de ofertas en tiempo real mediante Socket.io.

**Salidas:**
- Lista de ofertas de otros conductores (sin información personal del cliente)
- Actualizaciones en tiempo real cuando otros conductores realizan ofertas

**Postcondiciones:**
- Los conductores pueden ver las ofertas de la competencia.

---

### 3.6 RF-006: Aceptar o Rechazar Oferta

**Prioridad:** Alta  
**Descripción:** El sistema debe permitir a un cliente aceptar o rechazar una oferta de un conductor.

**Entradas:**
- ID de solicitud de viaje
- ID de oferta
- Acción (aceptar o rechazar)
- ID de cliente

**Procesamiento:**
1. El sistema valida que el cliente sea el propietario de la solicitud.
2. El sistema valida que la oferta esté en estado "pending".
3. Si la acción es "aceptar":
   - El sistema actualiza el estado de la solicitud a "matched".
   - El sistema actualiza el estado de la oferta a "accepted".
   - El sistema rechaza todas las demás ofertas pendientes.
   - El sistema marca al conductor como no disponible.
   - El sistema notifica al conductor seleccionado.
   - El sistema notifica al cliente.
4. Si la acción es "rechazar":
   - El sistema actualiza el estado de la oferta a "rejected".
   - El sistema notifica al conductor.

**Salidas:**
- Confirmación de acción
- Notificación al conductor
- Notificación al cliente (si se acepta)

**Postcondiciones:**
- Si se acepta, la solicitud queda asignada al conductor.
- Si se rechaza, la oferta queda marcada como rechazada.

---

### 3.7 RF-007: Notificar Aceptación o Rechazo

**Prioridad:** Alta  
**Descripción:** El sistema debe notificar a los usuarios cuando una solicitud es aceptada o rechazada.

**Entradas:**
- ID de solicitud de viaje
- Acción realizada (aceptar/rechazar)
- ID de conductor (si se acepta)

**Procesamiento:**
1. El sistema identifica a los usuarios involucrados (cliente y conductor).
2. El sistema envía notificación vía Socket.io al cliente.
3. El sistema envía notificación vía Socket.io al conductor (si aplica).
4. El sistema envía notificación a otros conductores que realizaron ofertas (si se acepta otra oferta).

**Salidas:**
- Notificación al cliente sobre el estado de su solicitud
- Notificación al conductor sobre el estado de su oferta
- Notificación a otros conductores sobre el cierre de la subasta

**Postcondiciones:**
- Todos los usuarios involucrados han sido notificados.

---

### 3.8 RF-008: Cancelar Solicitud por Timeout

**Prioridad:** Media  
**Descripción:** El sistema debe cancelar automáticamente una solicitud de viaje si el cliente no responde dentro de 5 minutos.

**Entradas:**
- ID de solicitud de viaje
- Tiempo transcurrido desde la creación

**Procesamiento:**
1. El sistema monitorea el tiempo transcurrido desde la creación de la solicitud.
2. Si han transcurrido 5 minutos y la solicitud sigue en estado "bidding_active":
   - El sistema actualiza el estado de la solicitud a "cancelled".
   - El sistema actualiza todas las ofertas pendientes a "expired".
   - El sistema notifica al cliente sobre la cancelación.
   - El sistema notifica a los conductores que realizaron ofertas.

**Salidas:**
- Solicitud cancelada
- Notificación al cliente
- Notificación a conductores

**Postcondiciones:**
- La solicitud queda cancelada.
- Las ofertas asociadas quedan marcadas como expiradas.

---

### 3.9 RF-009: Ver Todas las Solicitudes (Conductores)

**Prioridad:** Alta  
**Descripción:** El sistema debe permitir a todos los conductores ver todas las solicitudes de viaje disponibles.

**Entradas:**
- ID de conductor
- Estado de disponibilidad del conductor

**Procesamiento:**
1. El sistema valida que el usuario sea un conductor.
2. El sistema obtiene todas las solicitudes en estado "bidding_active".
3. El sistema presenta la lista de solicitudes disponibles.

**Salidas:**
- Lista de solicitudes de viaje disponibles
- Información de cada solicitud (origen, destino)

**Postcondiciones:**
- Los conductores pueden ver todas las solicitudes disponibles.

---

### 3.10 RF-010: Visualizar Métricas del Sistema (Administrador)

**Prioridad:** Alta  
**Descripción:** El sistema debe permitir al administrador visualizar métricas en tiempo real del sistema.

**Entradas:**
- ID de administrador
- Tipo de métricas solicitadas (dashboard, viajes, conductores, ingresos, bidding)

**Procesamiento:**
1. El sistema valida que el usuario sea un administrador.
2. El sistema obtiene las métricas solicitadas:
   - Métricas del dashboard: total de viajes, viajes activos, conductores totales, conductores online, pasajeros totales, ingresos totales.
   - Métricas de viajes: distribución por hora (últimas 24 horas).
   - Métricas de conductores: distribución por tipo de vehículo.
   - Métricas de ingresos: ingresos diarios (últimos 7 días).
   - Métricas de bidding: total de ofertas, ofertas aceptadas, contraofertas, tasa de aceptación, promedio de ofertas por viaje.
3. El sistema actualiza las métricas en tiempo real mediante Socket.io.

**Salidas:**
- Métricas del sistema en formato estructurado
- Actualizaciones en tiempo real cada 5 minutos

**Postcondiciones:**
- El administrador puede visualizar las métricas actualizadas del sistema.

---

### 3.11 RF-011: Gestionar Usuarios (Administrador)

**Prioridad:** Alta  
**Descripción:** El sistema debe permitir al administrador gestionar usuarios del sistema.

**Entradas:**
- ID de administrador
- ID de usuario (para operaciones específicas)
- Acción a realizar (ver lista, ver detalles, activar, desactivar)

**Procesamiento:**
1. El sistema valida que el usuario sea un administrador.
2. Si la acción es "ver lista":
   - El sistema obtiene todos los usuarios con información básica.
   - El sistema permite filtrar por tipo de usuario (cliente, conductor, administrador).
   - El sistema permite buscar por nombre, email o teléfono.
3. Si la acción es "ver detalles":
   - El sistema obtiene información completa del usuario.
   - El sistema muestra historial de viajes del usuario.
   - El sistema muestra estadísticas del usuario (si es conductor: rating, total de viajes, etc.).
4. Si la acción es "activar/desactivar":
   - El sistema actualiza el estado del usuario (isActive).
   - El sistema notifica al usuario sobre el cambio de estado.

**Salidas:**
- Lista de usuarios o detalles del usuario
- Confirmación de operación realizada

**Postcondiciones:**
- El administrador puede gestionar usuarios del sistema.
- Los cambios de estado se reflejan inmediatamente.

---

### 3.12 RF-012: Gestionar Viajes (Administrador)

**Prioridad:** Alta  
**Descripción:** El sistema debe permitir al administrador gestionar y monitorear viajes del sistema.

**Entradas:**
- ID de administrador
- ID de viaje (para operaciones específicas)
- Acción a realizar (ver lista, ver detalles, cancelar)

**Procesamiento:**
1. El sistema valida que el usuario sea un administrador.
2. Si la acción es "ver lista":
   - El sistema obtiene todas las solicitudes de viaje.
   - El sistema permite filtrar por estado (pending, bidding_active, matched, completed, cancelled).
   - El sistema permite buscar por ID de viaje, ID de cliente o ID de conductor.
   - El sistema permite ordenar por fecha de creación, precio, estado.
3. Si la acción es "ver detalles":
   - El sistema obtiene información completa del viaje.
   - El sistema muestra todas las ofertas asociadas.
   - El sistema muestra información del cliente y conductor (si aplica).
4. Si la acción es "cancelar":
   - El sistema valida que el viaje pueda ser cancelado.
   - El sistema cancela el viaje y actualiza todas las ofertas asociadas.
   - El sistema notifica al cliente y conductores involucrados.

**Salidas:**
- Lista de viajes o detalles del viaje
- Confirmación de operación realizada

**Postcondiciones:**
- El administrador puede gestionar y monitorear viajes del sistema.

---

### 3.13 RF-013: Visualizar Historial de Viajes (Cliente)

**Prioridad:** Media  
**Descripción:** El sistema debe permitir a un cliente visualizar su historial de viajes.

**Entradas:**
- ID de cliente
- Filtros opcionales (fecha, estado, rango de precios)

**Procesamiento:**
1. El sistema valida que el usuario sea un cliente.
2. El sistema obtiene todas las solicitudes de viaje del cliente.
3. El sistema aplica filtros si se especifican.
4. El sistema ordena los viajes por fecha (más recientes primero).
5. El sistema muestra información de cada viaje:
   - Origen y destino
   - Fecha y hora
   - Estado del viaje
   - Precio acordado
   - Información del conductor (si fue asignado)

**Salidas:**
- Lista de viajes del cliente con información detallada
- Estadísticas resumidas (total de viajes, viajes completados, gasto total)

**Postcondiciones:**
- El cliente puede ver su historial completo de viajes.

---

### 3.14 RF-014: Visualizar Historial de Viajes (Conductor)

**Prioridad:** Media  
**Descripción:** El sistema debe permitir a un conductor visualizar su historial de viajes.

**Entradas:**
- ID de conductor
- Filtros opcionales (fecha, estado, rango de precios)

**Procesamiento:**
1. El sistema valida que el usuario sea un conductor.
2. El sistema obtiene todas las ofertas realizadas por el conductor.
3. El sistema obtiene todos los viajes asignados al conductor.
4. El sistema aplica filtros si se especifican.
5. El sistema ordena los viajes por fecha (más recientes primero).
6. El sistema muestra información de cada viaje:
   - Origen y destino
   - Fecha y hora
   - Estado del viaje
   - Precio acordado
   - Información del cliente

**Salidas:**
- Lista de viajes del conductor con información detallada
- Estadísticas resumidas (total de viajes, viajes completados, ingresos totales, rating promedio)

**Postcondiciones:**
- El conductor puede ver su historial completo de viajes.

---

### 3.15 RF-015: Calcular y Visualizar Ganancias (Conductor)

**Prioridad:** Alta  
**Descripción:** El sistema debe permitir a un conductor calcular y visualizar sus ganancias.

**Entradas:**
- ID de conductor
- Período de tiempo (día, semana, mes, año, personalizado)

**Procesamiento:**
1. El sistema valida que el usuario sea un conductor.
2. El sistema obtiene todos los viajes completados del conductor en el período especificado.
3. El sistema calcula:
   - Ingresos brutos (suma de precios acordados de viajes completados).
   - Comisión del sistema (porcentaje aplicable, por defecto 15%).
   - Ingresos netos (ingresos brutos - comisión).
   - Número de viajes completados.
   - Promedio de ingreso por viaje.
4. El sistema presenta la información en formato de reporte.

**Salidas:**
- Reporte de ganancias con desglose detallado
- Gráficos de ingresos por período (opcional)
- Comparación con períodos anteriores (opcional)

**Postcondiciones:**
- El conductor puede visualizar sus ganancias calculadas.

---

### 3.16 RF-016: Calcular y Visualizar Ganancias del Sistema (Administrador)

**Prioridad:** Alta  
**Descripción:** El sistema debe permitir al administrador calcular y visualizar las ganancias totales del sistema.

**Entradas:**
- ID de administrador
- Período de tiempo (día, semana, mes, año, personalizado)

**Procesamiento:**
1. El sistema valida que el usuario sea un administrador.
2. El sistema obtiene todos los viajes completados en el período especificado.
3. El sistema calcula:
   - Ingresos totales del sistema (suma de comisiones de todos los viajes).
   - Número total de viajes completados.
   - Ingresos promedio por viaje.
   - Distribución de ingresos por tipo de vehículo.
   - Tendencias de ingresos (comparación con períodos anteriores).
4. El sistema presenta la información en formato de reporte.

**Salidas:**
- Reporte de ganancias del sistema con desglose detallado
- Gráficos de ingresos por período
- Comparación con períodos anteriores
- Proyecciones de ingresos (opcional)

**Postcondiciones:**
- El administrador puede visualizar las ganancias totales del sistema.

---

### 3.17 RF-017: Exportar Reportes (Administrador)

**Prioridad:** Media  
**Descripción:** El sistema debe permitir al administrador exportar reportes en diferentes formatos.

**Entradas:**
- ID de administrador
- Tipo de reporte (métricas, usuarios, viajes, ganancias)
- Formato de exportación (PDF, Excel, CSV)
- Período de tiempo
- Filtros adicionales

**Procesamiento:**
1. El sistema valida que el usuario sea un administrador.
2. El sistema genera el reporte según el tipo solicitado.
3. El sistema aplica los filtros y período de tiempo especificados.
4. El sistema formatea los datos según el formato de exportación solicitado.
5. El sistema genera el archivo y lo pone a disposición para descarga.

**Salidas:**
- Archivo de reporte en el formato solicitado
- Confirmación de generación del reporte

**Postcondiciones:**
- El administrador puede descargar el reporte generado.

---

### 3.18 RF-018: Calificar Viaje (Cliente)

**Prioridad:** Media  
**Descripción:** El sistema debe permitir a un cliente calificar un viaje completado.

**Entradas:**
- ID de cliente
- ID de viaje
- Calificación (1-5 estrellas)
- Comentario opcional

**Procesamiento:**
1. El sistema valida que el usuario sea un cliente.
2. El sistema valida que el viaje esté completado y pertenezca al cliente.
3. El sistema valida que el viaje no haya sido calificado previamente.
4. El sistema registra la calificación y comentario.
5. El sistema actualiza el rating del conductor basado en todas sus calificaciones.
6. El sistema notifica al conductor sobre la nueva calificación.

**Salidas:**
- Confirmación de calificación registrada
- Notificación al conductor

**Postcondiciones:**
- La calificación queda registrada en el sistema.
- El rating del conductor se actualiza.

---

### 3.19 RF-019: Calificar Cliente (Conductor)

**Prioridad:** Media  
**Descripción:** El sistema debe permitir a un conductor calificar a un cliente después de completar un viaje.

**Entradas:**
- ID de conductor
- ID de viaje
- Calificación (1-5 estrellas)
- Comentario opcional

**Procesamiento:**
1. El sistema valida que el usuario sea un conductor.
2. El sistema valida que el viaje esté completado y haya sido asignado al conductor.
3. El sistema valida que el viaje no haya sido calificado previamente por el conductor.
4. El sistema registra la calificación y comentario.
5. El sistema actualiza el rating del cliente basado en todas sus calificaciones.
6. El sistema notifica al cliente sobre la nueva calificación.

**Salidas:**
- Confirmación de calificación registrada
- Notificación al cliente

**Postcondiciones:**
- La calificación queda registrada en el sistema.
- El rating del cliente se actualiza.

---

### 3.20 RF-020: Notificaciones Push (Sistema)

**Prioridad:** Media  
**Descripción:** El sistema debe enviar notificaciones push a los usuarios para eventos importantes.

**Entradas:**
- ID de usuario
- Tipo de notificación
- Datos de la notificación

**Procesamiento:**
1. El sistema identifica el tipo de notificación a enviar:
   - Nueva solicitud de viaje (para conductores).
   - Nueva oferta recibida (para clientes).
   - Oferta aceptada/rechazada (para conductores y clientes).
   - Viaje cancelado.
   - Recordatorio de calificar viaje.
2. El sistema prepara el mensaje de notificación.
3. El sistema envía la notificación vía Socket.io.
4. El sistema registra la notificación enviada para historial.

**Salidas:**
- Notificación enviada al usuario
- Registro de notificación en el sistema

**Postcondiciones:**
- El usuario recibe la notificación en tiempo real.

---

### 3.21 RF-021: Buscar y Filtrar Solicitudes (Conductor)

**Prioridad:** Baja  
**Descripción:** El sistema debe permitir a un conductor buscar y filtrar solicitudes de viaje.

**Entradas:**
- ID de conductor
- Criterios de búsqueda (origen, destino, rango de precios, fecha)
- Filtros (solo con ofertas, sin ofertas, tiempo restante)

**Procesamiento:**
1. El sistema valida que el usuario sea un conductor.
2. El sistema obtiene todas las solicitudes activas.
3. El sistema aplica los criterios de búsqueda y filtros especificados.
4. El sistema ordena los resultados según preferencias del conductor.
5. El sistema presenta la lista filtrada de solicitudes.

**Salidas:**
- Lista de solicitudes filtradas según criterios
- Número total de resultados

**Postcondiciones:**
- El conductor puede ver solicitudes filtradas según sus criterios.

---

### 3.22 RF-022: Estadísticas Personales (Conductor)

**Prioridad:** Baja  
**Descripción:** El sistema debe permitir a un conductor visualizar sus estadísticas personales.

**Entradas:**
- ID de conductor

**Procesamiento:**
1. El sistema valida que el usuario sea un conductor.
2. El sistema calcula estadísticas del conductor:
   - Total de viajes completados.
   - Total de ofertas realizadas.
   - Tasa de aceptación de ofertas.
   - Rating promedio.
   - Ingresos totales.
   - Ingresos del mes actual.
   - Promedio de viajes por día/semana/mes.
   - Tiempo promedio de respuesta a solicitudes.
3. El sistema presenta las estadísticas en formato visual.

**Salidas:**
- Dashboard de estadísticas personales
- Gráficos de rendimiento (opcional)

**Postcondiciones:**
- El conductor puede visualizar sus estadísticas personales.

---

### 3.23 RF-023: Estadísticas Personales (Cliente)

**Prioridad:** Baja  
**Descripción:** El sistema debe permitir a un cliente visualizar sus estadísticas personales.

**Entradas:**
- ID de cliente

**Procesamiento:**
1. El sistema valida que el usuario sea un cliente.
2. El sistema calcula estadísticas del cliente:
   - Total de viajes realizados.
   - Total de viajes completados.
   - Gasto total.
   - Gasto del mes actual.
   - Rating promedio recibido.
   - Promedio de tiempo de espera para asignación de conductor.
3. El sistema presenta las estadísticas en formato visual.

**Salidas:**
- Dashboard de estadísticas personales
- Gráficos de uso (opcional)

**Postcondiciones:**
- El cliente puede visualizar sus estadísticas personales.

---

### 3.24 RF-024: Configuración de Comisiones (Administrador)

**Prioridad:** Media  
**Descripción:** El sistema debe permitir al administrador configurar el porcentaje de comisión del sistema.

**Entradas:**
- ID de administrador
- Nuevo porcentaje de comisión (0-100%)

**Procesamiento:**
1. El sistema valida que el usuario sea un administrador.
2. El sistema valida que el porcentaje esté en el rango válido.
3. El sistema actualiza la configuración de comisión.
4. El sistema registra el cambio para auditoría.
5. El sistema notifica a los conductores sobre el cambio (si aplica).

**Salidas:**
- Confirmación de actualización de comisión
- Notificación a conductores (opcional)

**Postcondiciones:**
- El porcentaje de comisión queda actualizado.
- Los nuevos viajes usarán el porcentaje actualizado.

---

### 3.25 RF-025: Auditoría y Logs del Sistema (Administrador)

**Prioridad:** Media  
**Descripción:** El sistema debe permitir al administrador visualizar logs y eventos de auditoría.

**Entradas:**
- ID de administrador
- Tipo de evento a consultar
- Rango de fechas
- Filtros adicionales

**Procesamiento:**
1. El sistema valida que el usuario sea un administrador.
2. El sistema obtiene los logs y eventos de auditoría según los filtros.
3. El sistema presenta los eventos ordenados por fecha (más recientes primero).
4. El sistema permite exportar los logs.

**Salidas:**
- Lista de eventos de auditoría
- Opción de exportar logs

**Postcondiciones:**
- El administrador puede revisar la actividad del sistema.

---

## 4. REQUISITOS NO FUNCIONALES

### 4.1 Rendimiento

- **RNF-001**: El sistema debe procesar y notificar solicitudes de viaje en menos de 2 segundos desde su creación.
- **RNF-002**: Las notificaciones en tiempo real deben tener una latencia menor a 500ms.
- **RNF-003**: El sistema debe soportar al menos 100 solicitudes simultáneas activas.

### 4.2 Confiabilidad

- **RNF-004**: El sistema debe tener una disponibilidad del 99% durante horas de operación.
- **RNF-005**: El sistema debe manejar errores de conexión sin pérdida de datos.

### 4.3 Usabilidad

- **RNF-006**: La interfaz debe ser intuitiva y requerir menos de 3 clics para realizar una solicitud de viaje.
- **RNF-007**: El sistema debe proporcionar retroalimentación visual clara sobre el estado de las operaciones.

### 4.4 Seguridad

- **RNF-008**: El sistema debe autenticar a todos los usuarios antes de permitir operaciones.
- **RNF-009**: Las comunicaciones deben estar protegidas mediante protocolos seguros (HTTPS/WSS).

### 4.5 Mantenibilidad

- **RNF-010**: El código debe seguir estándares de documentación y buenas prácticas.
- **RNF-011**: El sistema debe registrar eventos importantes para auditoría y depuración.

### 4.6 Escalabilidad

- **RNF-012**: El sistema debe ser capaz de escalar horizontalmente para soportar más usuarios.
- **RNF-013**: La arquitectura debe permitir agregar nuevos tipos de vehículos sin cambios mayores.

---

## 5. CASOS DE USO

### 5.1 CU-001: Cliente Crea Solicitud de Viaje

**Actor Principal:** Cliente  
**Actor Secundario:** Sistema  
**Precondiciones:**
- El cliente está autenticado en el sistema.
- El cliente tiene conexión a Internet.

**Flujo Principal:**
1. El cliente ingresa a la sección de solicitud de viaje.
2. El cliente ingresa la dirección de origen.
3. El sistema obtiene las coordenadas del origen.
4. El cliente ingresa la dirección de destino.
5. El sistema obtiene las coordenadas del destino.
6. El cliente confirma la solicitud.
7. El sistema valida que las coordenadas sean válidas.
8. El sistema calcula la distancia y duración estimada del viaje.
9. El sistema crea la solicitud con estado "bidding_active".
10. El sistema programa timeout de 5 minutos.
11. El sistema notifica a todos los conductores disponibles.
12. El sistema muestra confirmación al cliente.
13. El sistema inicia la visualización de ofertas en tiempo real.

**Flujos Alternativos:**

**5.1.1 Coordenadas inválidas:**
- 7a. Si las coordenadas de origen o destino no son válidas.
- 7b. El sistema muestra mensaje de error.
- 7c. El cliente puede corregir las direcciones y reintentar.

**5.1.2 Error de conexión:**
- 7a. Si hay error de conexión durante la validación.
- 7b. El sistema muestra mensaje de error.
- 7c. El cliente puede reintentar la operación.

**Postcondiciones:**
- La solicitud queda registrada en el sistema.
- Todos los conductores disponibles han sido notificados.
- El cliente puede ver su solicitud activa.

---

### 5.2 CU-002: Conductor Recibe Notificación de Solicitud

**Actor Principal:** Conductor  
**Actor Secundario:** Sistema  
**Precondiciones:**
- El conductor está autenticado y online.
- El conductor está disponible.
- Existe una solicitud de viaje activa.

**Flujo Principal:**
1. El sistema identifica que se ha creado una nueva solicitud.
2. El sistema verifica que el conductor cumpla con los criterios (online y disponible).
3. El sistema envía notificación vía Socket.io al conductor.
4. El conductor recibe la notificación en su dispositivo.
5. El conductor puede ver los detalles de la solicitud (origen, destino).
6. El conductor decide si realizar una oferta o ignorar la solicitud.

**Flujos Alternativos:**

**5.2.1 Conductor no disponible:**
- 2a. Si el conductor no está disponible u online.
- 2b. El sistema no envía la notificación.
- 2c. El flujo termina.

**Postcondiciones:**
- El conductor ha recibido la notificación (si aplica).
- El conductor puede ver la solicitud en su lista de solicitudes disponibles.

---

### 5.3 CU-003: Conductor Realiza Oferta de Precio

**Actor Principal:** Conductor  
**Actor Secundario:** Sistema, Cliente  
**Precondiciones:**
- El conductor está autenticado y disponible.
- Existe una solicitud de viaje en estado "bidding_active".
- El tiempo límite para ofertar no ha expirado.

**Flujo Principal:**
1. El conductor visualiza una solicitud de viaje disponible.
2. El conductor decide realizar una oferta.
3. El conductor ingresa el precio que ofrece.
4. El conductor confirma la oferta.
5. El sistema valida que la solicitud siga activa.
6. El sistema valida que el conductor esté disponible.
7. El sistema valida que no haya expirado el tiempo límite.
8. El sistema valida que el precio ofrecido sea válido (mayor a cero).
9. El sistema crea la oferta con estado "pending".
10. El sistema notifica al cliente sobre la nueva oferta.
11. El sistema notifica a otros conductores sobre la nueva oferta.
12. El sistema muestra confirmación al conductor.

**Flujos Alternativos:**

**5.3.1 Solicitud ya no está activa:**
- 6a. Si la solicitud ya fue aceptada o cancelada.
- 6b. El sistema muestra mensaje de error.
- 6c. El flujo termina.

**5.3.2 Tiempo límite expirado:**
- 8a. Si el tiempo límite para ofertar ha expirado.
- 8b. El sistema muestra mensaje de error.
- 8c. El flujo termina.

**5.3.3 Conductor ya no disponible:**
- 7a. Si el conductor ya no está disponible.
- 7b. El sistema muestra mensaje de error.
- 7c. El flujo termina.

**Postcondiciones:**
- La oferta queda registrada en el sistema.
- El cliente ha sido notificado de la nueva oferta.
- Otros conductores pueden ver la nueva oferta.

---

### 5.4 CU-004: Cliente Visualiza Ofertas en Tiempo Real

**Actor Principal:** Cliente  
**Actor Secundario:** Sistema  
**Precondiciones:**
- El cliente tiene una solicitud de viaje activa.
- El cliente está autenticado.

**Flujo Principal:**
1. El cliente accede a la vista de su solicitud de viaje activa.
2. El sistema obtiene todas las ofertas asociadas a la solicitud.
3. El sistema muestra la lista de ofertas con información del conductor.
4. El sistema se suscribe a actualizaciones en tiempo real vía Socket.io.
5. Cuando un conductor realiza una nueva oferta:
   - 5a. El sistema recibe la notificación.
   - 5b. El sistema actualiza la lista de ofertas.
   - 5c. El cliente ve la nueva oferta en tiempo real.
6. El cliente puede ver información de cada oferta:
   - Nombre del conductor
   - Rating del conductor
   - Precio ofrecido
   - Tipo de vehículo del conductor
   - Distancia estimada del conductor al punto de recogida

**Flujos Alternativos:**

**5.4.1 No hay ofertas:**
- 3a. Si no hay ofertas aún.
- 3b. El sistema muestra mensaje indicando que se están esperando ofertas.
- 3c. El sistema continúa esperando ofertas.

**5.4.2 Solicitud cancelada:**
- 5a. Si la solicitud es cancelada por timeout.
- 5b. El sistema muestra notificación de cancelación.
- 5c. El sistema detiene las actualizaciones en tiempo real.

**Postcondiciones:**
- El cliente puede ver todas las ofertas recibidas.
- Las ofertas se actualizan en tiempo real.

---

### 5.5 CU-005: Conductor Visualiza Ofertas de Otros Conductores

**Actor Principal:** Conductor  
**Actor Secundario:** Sistema  
**Precondiciones:**
- El conductor está autenticado.
- Existe una solicitud de viaje activa con ofertas.

**Flujo Principal:**
1. El conductor visualiza una solicitud de viaje.
2. El sistema obtiene todas las ofertas asociadas a la solicitud.
3. El sistema muestra la lista de ofertas (incluyendo las de otros conductores).
4. El sistema se suscribe a actualizaciones en tiempo real vía Socket.io.
5. Cuando otro conductor realiza una nueva oferta:
   - 5a. El sistema recibe la notificación.
   - 5b. El sistema actualiza la lista de ofertas.
   - 5c. El conductor ve la nueva oferta en tiempo real.
6. El conductor puede ver información de las ofertas:
   - Precio ofrecido por otros conductores
   - Tiempo de la oferta

**Flujos Alternativos:**

**5.5.1 No hay ofertas aún:**
- 3a. Si no hay ofertas.
- 3b. El sistema muestra que no hay ofertas.
- 3c. El sistema continúa esperando ofertas.

**Postcondiciones:**
- El conductor puede ver las ofertas de la competencia.
- Las ofertas se actualizan en tiempo real.

---

### 5.6 CU-006: Cliente Acepta o Rechaza Oferta

**Actor Principal:** Cliente  
**Actor Secundario:** Sistema, Conductor  
**Precondiciones:**
- El cliente tiene una solicitud de viaje activa.
- Existe al menos una oferta pendiente.
- El cliente está autenticado.

**Flujo Principal:**
1. El cliente visualiza las ofertas recibidas.
2. El cliente selecciona una oferta.
3. El cliente decide aceptar o rechazar la oferta.
4. Si acepta:
   - 4a. El cliente confirma la aceptación.
   - 4b. El sistema valida que la oferta siga pendiente.
   - 4c. El sistema actualiza el estado de la solicitud a "matched".
   - 4d. El sistema actualiza el estado de la oferta a "accepted".
   - 4e. El sistema rechaza todas las demás ofertas pendientes.
   - 4f. El sistema marca al conductor como no disponible.
   - 4g. El sistema notifica al conductor seleccionado.
   - 4h. El sistema notifica al cliente.
   - 4i. El sistema notifica a otros conductores sobre el cierre de la subasta.
5. Si rechaza:
   - 5a. El cliente confirma el rechazo.
   - 5b. El sistema actualiza el estado de la oferta a "rejected".
   - 5c. El sistema notifica al conductor.
   - 5d. La solicitud continúa activa para otras ofertas.

**Flujos Alternativos:**

**5.6.1 Oferta ya no está pendiente:**
- 4b. Si la oferta ya fue aceptada o rechazada.
- 4b1. El sistema muestra mensaje de error.
- 4b2. El flujo termina.

**5.6.2 Solicitud cancelada:**
- 4b. Si la solicitud fue cancelada.
- 4b1. El sistema muestra mensaje de error.
- 4b2. El flujo termina.

**Postcondiciones:**
- Si se acepta: La solicitud queda asignada al conductor, todas las demás ofertas son rechazadas.
- Si se rechaza: La oferta queda marcada como rechazada, la solicitud continúa activa.

---

### 5.7 CU-007: Sistema Cancela Solicitud por Timeout

**Actor Principal:** Sistema  
**Actor Secundario:** Cliente, Conductores  
**Precondiciones:**
- Existe una solicitud de viaje en estado "bidding_active".
- Han transcurrido 5 minutos desde la creación de la solicitud.
- El cliente no ha aceptado ninguna oferta.

**Flujo Principal:**
1. El sistema detecta que han transcurrido 5 minutos desde la creación de la solicitud.
2. El sistema verifica que la solicitud siga en estado "bidding_active".
3. El sistema actualiza el estado de la solicitud a "cancelled".
4. El sistema actualiza todas las ofertas pendientes a "expired".
5. El sistema notifica al cliente sobre la cancelación.
6. El sistema notifica a todos los conductores que realizaron ofertas.

**Flujos Alternativos:**

**5.7.1 Solicitud ya fue aceptada:**
- 2a. Si la solicitud ya fue aceptada.
- 2b. El sistema no realiza ninguna acción.
- 2c. El flujo termina.

**5.7.2 Solicitud ya fue cancelada:**
- 2a. Si la solicitud ya fue cancelada manualmente.
- 2b. El sistema no realiza ninguna acción.
- 2c. El flujo termina.

**Postcondiciones:**
- La solicitud queda cancelada.
- Todas las ofertas asociadas quedan marcadas como expiradas.
- El cliente y los conductores han sido notificados.

---

### 5.8 CU-008: Conductor Visualiza Todas las Solicitudes Disponibles

**Actor Principal:** Conductor  
**Actor Secundario:** Sistema  
**Precondiciones:**
- El conductor está autenticado.
- El conductor está online y disponible.

**Flujo Principal:**
1. El conductor accede a la vista de solicitudes disponibles.
2. El sistema obtiene todas las solicitudes en estado "bidding_active".
3. El sistema presenta la lista de solicitudes disponibles.
4. El conductor puede ver información de cada solicitud:
   - Origen y destino
   - Tiempo restante para ofertar
   - Número de ofertas recibidas
5. El sistema se suscribe a actualizaciones en tiempo real.
6. Cuando se crea una nueva solicitud:
   - 6a. El sistema recibe la notificación.
   - 6b. El sistema actualiza la lista de solicitudes.
   - 6c. El conductor ve la nueva solicitud en tiempo real.

**Flujos Alternativos:**

**5.8.1 No hay solicitudes disponibles:**
- 3a. Si no hay solicitudes activas.
- 3b. El sistema muestra mensaje indicando que no hay solicitudes disponibles.
- 3c. El sistema continúa monitoreando nuevas solicitudes.

**5.8.2 Conductor no disponible:**
- 1a. Si el conductor no está disponible.
- 1b. El sistema puede ocultar o deshabilitar la vista de solicitudes.
- 1c. El flujo termina.

**Postcondiciones:**
- El conductor puede ver todas las solicitudes disponibles.
- Las solicitudes se actualizan en tiempo real.

---

### 5.9 CU-009: Administrador Visualiza Métricas del Sistema

**Actor Principal:** Administrador  
**Actor Secundario:** Sistema  
**Precondiciones:**
- El administrador está autenticado.
- El administrador tiene permisos de administración.

**Flujo Principal:**
1. El administrador accede al dashboard de administración.
2. El administrador selecciona el tipo de métricas a visualizar.
3. El sistema obtiene las métricas solicitadas.
4. El sistema presenta las métricas en formato visual (gráficos, tablas).
5. El sistema se suscribe a actualizaciones en tiempo real.
6. Cada 5 minutos, el sistema actualiza las métricas automáticamente.
7. El administrador puede actualizar manualmente las métricas.

**Flujos Alternativos:**

**5.9.1 Error al obtener métricas:**
- 3a. Si hay error al obtener las métricas.
- 3b. El sistema muestra mensaje de error.
- 3c. El administrador puede reintentar.

**Postcondiciones:**
- El administrador puede visualizar las métricas del sistema.
- Las métricas se actualizan en tiempo real.

---

### 5.10 CU-010: Administrador Gestiona Usuarios

**Actor Principal:** Administrador  
**Actor Secundario:** Sistema, Usuarios  
**Precondiciones:**
- El administrador está autenticado.
- El administrador tiene permisos de administración.

**Flujo Principal:**
1. El administrador accede a la sección de gestión de usuarios.
2. El administrador puede:
   - Ver lista de todos los usuarios.
   - Buscar usuarios por nombre, email o teléfono.
   - Filtrar por tipo de usuario.
   - Ver detalles de un usuario específico.
   - Activar o desactivar un usuario.
3. Si el administrador selecciona ver detalles:
   - 3a. El sistema muestra información completa del usuario.
   - 3b. El sistema muestra historial de viajes del usuario.
   - 3c. El sistema muestra estadísticas del usuario.
4. Si el administrador activa/desactiva un usuario:
   - 4a. El administrador confirma la acción.
   - 4b. El sistema actualiza el estado del usuario.
   - 4c. El sistema notifica al usuario sobre el cambio.

**Flujos Alternativos:**

**5.10.1 Usuario no encontrado:**
- 3a. Si el usuario no existe.
- 3b. El sistema muestra mensaje de error.
- 3c. El flujo termina.

**Postcondiciones:**
- El administrador puede gestionar usuarios del sistema.
- Los cambios se reflejan inmediatamente.

---

### 5.11 CU-011: Cliente Visualiza Historial de Viajes

**Actor Principal:** Cliente  
**Actor Secundario:** Sistema  
**Precondiciones:**
- El cliente está autenticado.
- El cliente tiene al menos un viaje en su historial.

**Flujo Principal:**
1. El cliente accede a la sección de historial de viajes.
2. El sistema obtiene todos los viajes del cliente.
3. El cliente puede aplicar filtros (fecha, estado, rango de precios).
4. El sistema aplica los filtros y muestra los viajes filtrados.
5. El cliente puede ver detalles de cada viaje:
   - Origen y destino
   - Fecha y hora
   - Estado del viaje
   - Precio acordado
   - Información del conductor (si fue asignado)
6. El sistema muestra estadísticas resumidas (total de viajes, gasto total).

**Flujos Alternativos:**

**5.11.1 No hay viajes:**
- 2a. Si el cliente no tiene viajes.
- 2b. El sistema muestra mensaje indicando que no hay historial.
- 2c. El flujo termina.

**Postcondiciones:**
- El cliente puede ver su historial completo de viajes.

---

### 5.12 CU-012: Conductor Visualiza Historial de Viajes

**Actor Principal:** Conductor  
**Actor Secundario:** Sistema  
**Precondiciones:**
- El conductor está autenticado.
- El conductor tiene al menos un viaje en su historial.

**Flujo Principal:**
1. El conductor accede a la sección de historial de viajes.
2. El sistema obtiene todos los viajes del conductor (asignados y ofertas realizadas).
3. El conductor puede aplicar filtros (fecha, estado, rango de precios).
4. El sistema aplica los filtros y muestra los viajes filtrados.
5. El conductor puede ver detalles de cada viaje:
   - Origen y destino
   - Fecha y hora
   - Estado del viaje
   - Precio acordado
   - Información del cliente
6. El sistema muestra estadísticas resumidas (total de viajes, ingresos totales, rating promedio).

**Flujos Alternativos:**

**5.12.1 No hay viajes:**
- 2a. Si el conductor no tiene viajes.
- 2b. El sistema muestra mensaje indicando que no hay historial.
- 2c. El flujo termina.

**Postcondiciones:**
- El conductor puede ver su historial completo de viajes.

---

### 5.13 CU-013: Conductor Visualiza Ganancias

**Actor Principal:** Conductor  
**Actor Secundario:** Sistema  
**Precondiciones:**
- El conductor está autenticado.
- El conductor tiene al menos un viaje completado.

**Flujo Principal:**
1. El conductor accede a la sección de ganancias.
2. El conductor selecciona el período de tiempo (día, semana, mes, año, personalizado).
3. El sistema obtiene todos los viajes completados del conductor en el período especificado.
4. El sistema calcula:
   - Ingresos brutos
   - Comisión del sistema
   - Ingresos netos
   - Número de viajes completados
   - Promedio de ingreso por viaje
5. El sistema presenta la información en formato de reporte.
6. El sistema puede mostrar gráficos de ingresos por período.

**Flujos Alternativos:**

**5.13.1 No hay viajes en el período:**
- 3a. Si no hay viajes completados en el período especificado.
- 3b. El sistema muestra mensaje indicando que no hay datos.
- 3c. El conductor puede seleccionar otro período.

**Postcondiciones:**
- El conductor puede visualizar sus ganancias calculadas.

---

### 5.14 CU-014: Administrador Visualiza Ganancias del Sistema

**Actor Principal:** Administrador  
**Actor Secundario:** Sistema  
**Precondiciones:**
- El administrador está autenticado.
- El administrador tiene permisos de administración.

**Flujo Principal:**
1. El administrador accede a la sección de ganancias del sistema.
2. El administrador selecciona el período de tiempo (día, semana, mes, año, personalizado).
3. El sistema obtiene todos los viajes completados en el período especificado.
4. El sistema calcula:
   - Ingresos totales del sistema (comisiones)
   - Número total de viajes completados
   - Ingresos promedio por viaje
   - Distribución de ingresos por tipo de vehículo
   - Tendencias de ingresos (comparación con períodos anteriores)
5. El sistema presenta la información en formato de reporte con gráficos.
6. El administrador puede exportar el reporte.

**Flujos Alternativos:**

**5.14.1 No hay datos en el período:**
- 3a. Si no hay viajes completados en el período especificado.
- 3b. El sistema muestra mensaje indicando que no hay datos.
- 3c. El administrador puede seleccionar otro período.

**Postcondiciones:**
- El administrador puede visualizar las ganancias totales del sistema.

---

### 5.15 CU-015: Cliente Califica Viaje

**Actor Principal:** Cliente  
**Actor Secundario:** Sistema, Conductor  
**Precondiciones:**
- El cliente está autenticado.
- El cliente tiene un viaje completado que no ha sido calificado.

**Flujo Principal:**
1. El cliente accede a la sección de historial de viajes.
2. El cliente selecciona un viaje completado sin calificar.
3. El cliente ingresa una calificación (1-5 estrellas).
4. El cliente puede agregar un comentario opcional.
5. El cliente confirma la calificación.
6. El sistema valida que el viaje esté completado y pertenezca al cliente.
7. El sistema valida que el viaje no haya sido calificado previamente.
8. El sistema registra la calificación y comentario.
9. El sistema actualiza el rating del conductor basado en todas sus calificaciones.
10. El sistema notifica al conductor sobre la nueva calificación.

**Flujos Alternativos:**

**5.15.1 Viaje ya calificado:**
- 7a. Si el viaje ya fue calificado.
- 7b. El sistema muestra mensaje indicando que el viaje ya fue calificado.
- 7c. El flujo termina.

**5.15.2 Viaje no completado:**
- 6a. Si el viaje no está completado.
- 6b. El sistema muestra mensaje de error.
- 6c. El flujo termina.

**Postcondiciones:**
- La calificación queda registrada en el sistema.
- El rating del conductor se actualiza.

---

### 5.16 CU-016: Conductor Califica Cliente

**Actor Principal:** Conductor  
**Actor Secundario:** Sistema, Cliente  
**Precondiciones:**
- El conductor está autenticado.
- El conductor tiene un viaje completado que no ha sido calificado.

**Flujo Principal:**
1. El conductor accede a la sección de historial de viajes.
2. El conductor selecciona un viaje completado sin calificar.
3. El conductor ingresa una calificación (1-5 estrellas).
4. El conductor puede agregar un comentario opcional.
5. El conductor confirma la calificación.
6. El sistema valida que el viaje esté completado y haya sido asignado al conductor.
7. El sistema valida que el viaje no haya sido calificado previamente por el conductor.
8. El sistema registra la calificación y comentario.
9. El sistema actualiza el rating del cliente basado en todas sus calificaciones.
10. El sistema notifica al cliente sobre la nueva calificación.

**Flujos Alternativos:**

**5.16.1 Viaje ya calificado:**
- 7a. Si el viaje ya fue calificado por el conductor.
- 7b. El sistema muestra mensaje indicando que el viaje ya fue calificado.
- 7c. El flujo termina.

**Postcondiciones:**
- La calificación queda registrada en el sistema.
- El rating del cliente se actualiza.

---

### 5.17 CU-017: Administrador Exporta Reportes

**Actor Principal:** Administrador  
**Actor Secundario:** Sistema  
**Precondiciones:**
- El administrador está autenticado.
- El administrador tiene permisos de administración.

**Flujo Principal:**
1. El administrador accede a la sección de reportes.
2. El administrador selecciona el tipo de reporte (métricas, usuarios, viajes, ganancias).
3. El administrador selecciona el formato de exportación (PDF, Excel, CSV).
4. El administrador especifica el período de tiempo.
5. El administrador aplica filtros adicionales si es necesario.
6. El administrador solicita la generación del reporte.
7. El sistema genera el reporte según los parámetros especificados.
8. El sistema formatea los datos según el formato solicitado.
9. El sistema genera el archivo y lo pone a disposición para descarga.
10. El administrador descarga el archivo generado.

**Flujos Alternativos:**

**5.17.1 Error al generar reporte:**
- 7a. Si hay error al generar el reporte.
- 7b. El sistema muestra mensaje de error.
- 7c. El administrador puede reintentar con otros parámetros.

**5.17.2 No hay datos para el período:**
- 7a. Si no hay datos para el período especificado.
- 7b. El sistema muestra mensaje indicando que no hay datos.
- 7c. El administrador puede seleccionar otro período.

**Postcondiciones:**
- El administrador puede descargar el reporte generado.

---

### 5.18 CU-018: Conductor Visualiza Estadísticas Personales

**Actor Principal:** Conductor  
**Actor Secundario:** Sistema  
**Precondiciones:**
- El conductor está autenticado.

**Flujo Principal:**
1. El conductor accede a la sección de estadísticas personales.
2. El sistema calcula las estadísticas del conductor:
   - Total de viajes completados
   - Total de ofertas realizadas
   - Tasa de aceptación de ofertas
   - Rating promedio
   - Ingresos totales
   - Ingresos del mes actual
   - Promedio de viajes por día/semana/mes
   - Tiempo promedio de respuesta a solicitudes
3. El sistema presenta las estadísticas en formato visual (dashboard).
4. El sistema puede mostrar gráficos de rendimiento.

**Postcondiciones:**
- El conductor puede visualizar sus estadísticas personales.

---

### 5.19 CU-019: Cliente Visualiza Estadísticas Personales

**Actor Principal:** Cliente  
**Actor Secundario:** Sistema  
**Precondiciones:**
- El cliente está autenticado.

**Flujo Principal:**
1. El cliente accede a la sección de estadísticas personales.
2. El sistema calcula las estadísticas del cliente:
   - Total de viajes realizados
   - Total de viajes completados
   - Gasto total
   - Gasto del mes actual
   - Rating promedio recibido
   - Promedio de tiempo de espera para asignación de conductor
3. El sistema presenta las estadísticas en formato visual (dashboard).
4. El sistema puede mostrar gráficos de uso.

**Postcondiciones:**
- El cliente puede visualizar sus estadísticas personales.

---

### 5.20 CU-020: Administrador Configura Comisiones

**Actor Principal:** Administrador  
**Actor Secundario:** Sistema  
**Precondiciones:**
- El administrador está autenticado.
- El administrador tiene permisos de administración.

**Flujo Principal:**
1. El administrador accede a la sección de configuración del sistema.
2. El administrador selecciona la opción de configurar comisiones.
3. El administrador ingresa el nuevo porcentaje de comisión (0-100%).
4. El administrador confirma el cambio.
5. El sistema valida que el porcentaje esté en el rango válido.
6. El sistema actualiza la configuración de comisión.
7. El sistema registra el cambio para auditoría.
8. El sistema notifica a los conductores sobre el cambio (opcional).
9. El sistema muestra confirmación de actualización.

**Flujos Alternativos:**

**5.20.1 Porcentaje inválido:**
- 5a. Si el porcentaje está fuera del rango válido.
- 5b. El sistema muestra mensaje de error.
- 5c. El administrador puede corregir el porcentaje y reintentar.

**Postcondiciones:**
- El porcentaje de comisión queda actualizado.
- Los nuevos viajes usarán el porcentaje actualizado.

---

## 6. DIAGRAMA DE CASOS DE USO

```
┌─────────────────────────────────────────────────────────────┐
│                    SISTEMA DIDI SICUANI                    │
└─────────────────────────────────────────────────────────────┘
                              │
        ┌─────────────────────┼─────────────────────┐
        │                     │                     │
        ▼                     ▼                     ▼
   ┌─────────┐          ┌──────────┐          ┌──────────┐
   │ Cliente │          │ Conductor│          │Sistema   │
   └────┬────┘          └────┬─────┘          └────┬─────┘
        │                    │                     │
        │                    │                     │
        │ CU-001             │                     │
        │ Crear Solicitud    │                     │
        ├────────────────────┼─────────────────────┤
        │                    │                     │
        │                    │ CU-002              │
        │                    │ Recibir            │
        │                    │ Notificación        │
        │                    │                     │
        │                    │ CU-003              │
        │                    │ Realizar Oferta     │
        │                    │                     │
        │ CU-004             │                     │
        │ Ver Ofertas        │                     │
        │                    │                     │
        │                    │ CU-005              │
        │                    │ Ver Ofertas de     │
        │                    │ Otros               │
        │                    │                     │
        │ CU-006             │                     │
        │ Aceptar/Rechazar   │                     │
        │                    │                     │
        │                    │ CU-008              │
        │                    │ Ver Todas las       │
        │                    │ Solicitudes         │
        │                    │                     │
        │                    │                     │ CU-007
        │                    │                     │ Cancelar
        │                    │                     │ por Timeout
        │                    │                     │
        └────────────────────┴─────────────────────┘
```

---

## 7. GLOSARIO

- **Bid**: Oferta de precio realizada por un conductor para una solicitud de viaje.
- **Bidding Active**: Estado de una solicitud de viaje que está aceptando ofertas.
- **Cliente/Pasajero**: Usuario que solicita servicios de transporte.
- **Conductor**: Usuario que proporciona servicios de transporte.
- **Contraoferta**: Oferta de precio diferente al precio propuesto por el cliente.
- **Matched**: Estado de una solicitud de viaje que ha sido asignada a un conductor.
- **Ride Request**: Solicitud de viaje creada por un cliente.
- **Socket.io**: Biblioteca para comunicación en tiempo real mediante WebSockets.
- **Timeout**: Tiempo límite para una operación, después del cual se cancela automáticamente.

---

## 8. APÉNDICES

### 8.1 Estados de Solicitud de Viaje

- **pending**: Solicitud creada pero aún no activa.
- **bidding_active**: Solicitud activa y aceptando ofertas.
- **matched**: Solicitud asignada a un conductor.
- **accepted**: Solicitud aceptada por el cliente.
- **in_progress**: Viaje en curso.
- **completed**: Viaje completado.
- **cancelled**: Solicitud cancelada.

### 8.2 Estados de Oferta (Bid)

- **pending**: Oferta pendiente de respuesta del cliente.
- **accepted**: Oferta aceptada por el cliente.
- **rejected**: Oferta rechazada por el cliente.
- **expired**: Oferta expirada (solicitud cancelada o timeout).

### 8.3 Tipos de Vehículo

- **taxi**: Vehículo tipo taxi.
- **mototaxi**: Vehículo tipo mototaxi.
- **any**: Cualquier tipo de vehículo.

---

**Fin del Documento**

