# 💰 BudgetUp para MiPymes

<div align="center">

![BudgetUp Logo](https://via.placeholder.com/200x80/3B82F6/FFFFFF?text=BudgetUp)

**Gestión financiera simple y efectiva para micro y pequeñas empresas dominicanas**

[![Next.js](https://img.shields.io/badge/Next.js-16-black?style=for-the-badge&logo=next.js)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-blue?style=for-the-badge&logo=typescript)](https://www.typescriptlang.org/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-v4-38B2AC?style=for-the-badge&logo=tailwind-css)](https://tailwindcss.com/)
[![Supabase](https://img.shields.io/badge/Supabase-Database-green?style=for-the-badge&logo=supabase)](https://supabase.com/)
[![Vercel](https://img.shields.io/badge/Vercel-Deploy-black?style=for-the-badge&logo=vercel)](https://vercel.com/)

[🚀 Demo en Vivo](https://budgetup-mipymes.vercel.app) • [📖 Documentación](./docs) • [🐛 Reportar Bug](https://github.com/diegomarte9/budgetup-mipymes/issues)

</div>

---

## 🌟 Características Principales

<table>
<tr>
<td width="50%">

### 💼 **Gestión Multi-Empresa**
- Organizaciones independientes con RLS
- Roles: Owner, Admin, Member
- Invitaciones por código único
- Switching rápido entre empresas

### 💳 **Transacciones Completas**
- Ingresos, gastos y transferencias
- Soporte para ITBIS (18% predeterminado)
- Adjuntos y notas detalladas
- Importación masiva CSV

</td>
<td width="50%">

### 📊 **Dashboard Inteligente**
- KPIs del mes actual en tiempo real
- Gráfico de balance de 12 meses
- Top categorías de gastos (donut chart)
- Métricas específicas para MiPymes

### 📄 **Reportes Profesionales**
- Exportación CSV con streaming
- PDFs con formato empresarial
- Filtros avanzados por fecha/cuenta
- Optimizado para contadores

</td>
</tr>
</table>

---

## 🇩🇴 Diseñado para República Dominicana

- **💱 Peso Dominicano (DOP)** como moneda predeterminada
- **🧾 ITBIS** integrado en transacciones (18%)
- **🏢 MiPymes** - Categorías típicas preconfiguradas
- **🌐 Español Dominicano** - Interfaz completamente localizada
- **📱 Mobile-First** - Optimizado para dispositivos móviles

---

## 🛠️ Stack Tecnológico

### Frontend
- **⚡ Next.js 16** - App Router con React 19
- **🎨 Tailwind CSS v4** - Diseño moderno y responsive
- **🧩 shadcn/ui** - Componentes accesibles y customizables
- **📊 Chart.js** - Visualizaciones interactivas
- **🔄 React Query** - Estado del servidor optimizado

### Backend
- **🗄️ Supabase** - PostgreSQL con Row Level Security
- **🔐 Supabase Auth** - Autenticación completa
- **📁 Supabase Storage** - Almacenamiento de adjuntos
- **🛡️ RLS Policies** - Seguridad multi-tenant

### DevOps
- **📦 pnpm** - Gestor de paquetes rápido
- **🔧 TypeScript** - Type safety completo
- **🧪 Playwright** - Tests end-to-end
- **🚀 Vercel** - Deployment automático

---

## 🚀 Inicio Rápido

### Prerrequisitos

- Node.js 18+ 
- pnpm 8+
- Cuenta en Supabase

### Instalación

```bash
# 1. Clonar el repositorio
git clone https://github.com/diegomarte9/budgetup-mipymes.git
cd budgetup-mipymes

# 2. Instalar dependencias
pnpm install

# 3. Configurar variables de entorno
cp .env.example .env.local
# Editar .env.local con tus credenciales de Supabase

# 4. Ejecutar migraciones de base de datos
pnpm db:migrate

# 5. Iniciar servidor de desarrollo
pnpm dev
```

### Variables de Entorno

```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=tu_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=tu_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=tu_service_role_key

# Next.js
NEXTAUTH_SECRET=tu_nextauth_secret
NEXTAUTH_URL=http://localhost:3000
```

---

## 📁 Estructura del Proyecto

```
src/
├── app/                    # Next.js App Router
│   ├── (auth)/            # Rutas de autenticación
│   ├── (dashboard)/       # Rutas principales
│   └── api/               # API Routes
├── components/            # Componentes reutilizables
│   ├── ui/               # shadcn/ui components
│   ├── forms/            # Formularios específicos
│   ├── charts/           # Componentes de gráficos
│   └── layout/           # Componentes de layout
├── lib/                  # Utilidades y configuración
│   ├── supabase/        # Cliente y tipos
│   ├── validations/     # Esquemas Zod
│   └── utils/           # Funciones utilitarias
├── hooks/               # Custom React hooks
├── stores/              # Zustand stores
└── types/               # Definiciones TypeScript
```

---

## 🎯 Roadmap de Desarrollo

### ✅ Sprint 0 - Bootstrap & Entorno
- [x] Configuración Next.js + TypeScript + Tailwind
- [x] Estructura de proyecto y herramientas
- [ ] Configuración Supabase y variables de entorno
- [ ] CI/CD y deployment en Vercel

### 🔄 Sprint 1 - Auth & Organizaciones (En Progreso)
- [ ] Sistema de autenticación completo
- [ ] Gestión de organizaciones y roles
- [ ] Onboarding y invitaciones
- [ ] Políticas RLS y seguridad

### 📋 Sprint 2 - Cuentas & Categorías
- [ ] CRUD de cuentas financieras
- [ ] Gestión de categorías
- [ ] Validaciones y constraints
- [ ] Interfaz de administración

### 💰 Sprint 3 - Transacciones
- [ ] Formularios de ingresos/gastos/transferencias
- [ ] Atajos de teclado (i/e/t)
- [ ] Importación CSV
- [ ] Gestión de adjuntos

### 📊 Sprint 4 - Dashboard & KPIs
- [ ] Métricas en tiempo real
- [ ] Gráficos interactivos
- [ ] Filtros y rangos de fecha
- [ ] Estados vacíos para nuevos usuarios

### 📄 Sprint 5 - Reportes & Exportaciones
- [ ] Filtros avanzados
- [ ] Exportación CSV con streaming
- [ ] Generación de PDFs profesionales
- [ ] Historial de reportes

### 🔐 Sprint 6 - Auditoría & Roles Avanzados
- [ ] Sistema de auditoría automático
- [ ] Gestión avanzada de usuarios
- [ ] Logs de actividad reciente
- [ ] Permisos granulares

### ✨ Sprint 7 - Pulido & Entrega
- [ ] Optimización de rendimiento
- [ ] Modo oscuro y mejoras UX
- [ ] Localización completa es-DO
- [ ] Documentación y datos demo

---

## 🧪 Testing

```bash
# Tests unitarios
pnpm test

# Tests E2E con Playwright
pnpm test:e2e

# Coverage
pnpm test:coverage

# Linting y type checking
pnpm lint
pnpm type-check
```

---

## 🚀 Deployment

### Vercel (Recomendado)

```bash
# 1. Instalar Vercel CLI
npm i -g vercel

# 2. Deploy
vercel

# 3. Configurar variables de entorno en Vercel Dashboard
```

### Docker

```bash
# Build imagen
docker build -t budgetup-mipymes .

# Ejecutar contenedor
docker run -p 3000:3000 budgetup-mipymes
```

---

## 🤝 Contribuir

¡Las contribuciones son bienvenidas! Por favor lee nuestra [Guía de Contribución](./CONTRIBUTING.md).

### Proceso de Desarrollo

1. Fork el proyecto
2. Crea una rama feature (`git checkout -b feature/nueva-funcionalidad`)
3. Commit tus cambios (`git commit -m 'feat: agregar nueva funcionalidad'`)
4. Push a la rama (`git push origin feature/nueva-funcionalidad`)
5. Abre un Pull Request

### Convenciones de Commits

Usamos [Conventional Commits](https://www.conventionalcommits.org/):

- `feat:` - Nueva funcionalidad
- `fix:` - Corrección de bugs
- `docs:` - Documentación
- `style:` - Formato, punto y coma faltante, etc.
- `refactor:` - Refactoring de código
- `test:` - Agregar tests
- `chore:` - Mantenimiento

---

## 📄 Licencia

Este proyecto está bajo la Licencia MIT. Ver [LICENSE](./LICENSE) para más detalles.

---

## 👥 Equipo

<table>
<tr>
<td align="center">
<img src="https://github.com/diegomarte9.png" width="100px;" alt="Diego A. Marte Toledo"/><br />
<sub><b>Tu Nombre</b></sub><br />
<a href="https://github.com/diegomarte9" title="GitHub">💻</a>
<a href="mailto:soportemdev@gmail.com" title="Email">📧</a>
</td>
<td align="center">
<img src="https://via.placeholder.com/100x100/6366F1/FFFFFF?text=AI" width="100px;" alt="Kiro AI"/><br />
<sub><b>Kiro AI</b></sub><br />
<a href="#" title="AI Assistant">🤖</a>
<a href="#" title="Code Generation">⚡</a>
</td>
</tr>
</table>

---

## 🙏 Agradecimientos

- [Next.js](https://nextjs.org/) por el framework increíble
- [Supabase](https://supabase.com/) por la infraestructura backend
- [shadcn/ui](https://ui.shadcn.com/) por los componentes hermosos
- [Vercel](https://vercel.com/) por el hosting gratuito
- Comunidad de desarrolladores dominicanos 🇩🇴

---

<div align="center">

**¿Te gusta BudgetUp? ¡Dale una ⭐ al repositorio!**

[⬆ Volver arriba](#-budgetup-para-mipymes)

</div>