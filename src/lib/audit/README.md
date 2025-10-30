# Sistema de Auditoría - BudgetUp

## Descripción

El sistema de auditoría de BudgetUp registra automáticamente todas las acciones importantes realizadas por los usuarios en el sistema, proporcionando un registro completo de actividad para cada organización.

## Componentes Implementados

### 1. Base de Datos

- **Tabla `audit_logs`**: Almacena todos los registros de auditoría
- **Triggers automáticos**: Registran automáticamente operaciones CRUD en:
  - `transactions` (transacciones)
  - `accounts` (cuentas)
  - `categories` (categorías)
  - `organizations` (organizaciones)
  - `memberships` (membresías)

### 2. API Endpoints

- **GET `/api/audit-logs`**: Obtiene registros de auditoría con filtros
- **POST `/api/audit-logs/manual`**: Crea registros manuales para acciones específicas

### 3. Componentes Frontend

- **`AuditLogsList`**: Componente para mostrar la lista de registros con filtros
- **Página `/activity`**: Interfaz completa para visualizar la actividad reciente

### 4. Hooks y Utilidades

- **`useAuditLogs`**: Hook para obtener y gestionar registros de auditoría
- **`createManualAuditLog`**: Función para crear registros manuales desde el cliente
- **Funciones de formateo**: Para mostrar acciones y tablas en español

## Tipos de Registros

### Automáticos (via triggers de BD)
- `create`: Creación de registros
- `update`: Actualización de registros
- `delete`: Eliminación de registros

### Manuales (via API)
- `login`: Inicio de sesión de usuario
- `logout`: Cierre de sesión de usuario
- `invite_sent`: Invitación enviada
- `role_changed`: Cambio de rol de usuario

## Uso

### Ver Actividad Reciente
```typescript
// Navegar a /activity para ver la interfaz completa
// O usar el componente directamente:
<AuditLogsList organizationId={organizationId} />
```

### Crear Registro Manual
```typescript
import { createManualAuditLog } from '@/lib/audit/client';

// Registrar invitación enviada
await logInvitationSent(organizationId, invitationId, email, role);

// Registrar cambio de rol
await logRoleChanged(organizationId, membershipId, oldRole, newRole, userEmail);
```

### Filtrar Registros
La interfaz permite filtrar por:
- Tipo de acción
- Tabla afectada
- Rango de fechas
- Usuario específico

## Seguridad

- **RLS (Row Level Security)**: Solo usuarios miembros de una organización pueden ver sus registros
- **Inmutabilidad**: Los registros de auditoría no pueden ser modificados o eliminados
- **Validación**: Todos los datos son validados con Zod schemas

## Integración

El sistema está integrado en:
- ✅ Navegación principal (enlace "Actividad")
- ✅ API de invitaciones (registra invitaciones enviadas)
- ✅ Triggers de base de datos (registra CRUD automáticamente)

## Próximos Pasos

Para completar la integración:
1. Agregar logging manual en hooks de autenticación
2. Integrar en cambios de roles de usuarios
3. Agregar más metadatos contextuales según necesidades