# Chart Components

Este directorio contiene los componentes de gráficos para el dashboard de BudgetUp, optimizados para MiPymes dominicanas.

## Componentes Disponibles

### KPICards
Muestra las métricas clave del mes actual con comparación vs mes anterior:
- Ingresos del mes
- Gastos del mes  
- Balance neto
- Indicadores de tendencia (↑↓)

```tsx
import { KPICards } from '@/components/charts';

<KPICards 
  data={kpisData} 
  currency="DOP" 
  isLoading={false} 
/>
```

### MonthlyBalanceChart
Gráfico de líneas que muestra la evolución de ingresos, gastos y balance neto durante los últimos 12 meses.

```tsx
import { MonthlyBalanceChart } from '@/components/charts';

<MonthlyBalanceChart 
  data={monthlyData} 
  currency="DOP" 
  height={350}
  isLoading={false} 
/>
```

### CategoryDonutChart
Gráfico de dona que muestra la distribución de gastos por categoría con lista detallada.

```tsx
import { CategoryDonutChart } from '@/components/charts';

<CategoryDonutChart 
  data={categoriesData} 
  totalExpenses={totalAmount}
  currency="DOP" 
  height={300}
  isLoading={false} 
/>
```

### DashboardCharts
Componente completo que combina todos los gráficos con hooks de datos integrados.

```tsx
import { DashboardCharts } from '@/components/charts';

<DashboardCharts 
  organizationId="uuid" 
  currency="DOP" 
/>
```

## Características

- **Responsive Design**: Todos los componentes se adaptan a diferentes tamaños de pantalla
- **Colores Consistentes**: Paleta de colores unificada siguiendo el design system
- **Formato DOP**: Formateo automático de moneda en pesos dominicanos
- **Estados de Carga**: Skeletons animados durante la carga de datos
- **Estados Vacíos**: Mensajes informativos cuando no hay datos
- **Accesibilidad**: Componentes accesibles con ARIA labels apropiados
- **Interactividad**: Tooltips informativos y hover effects

## Dependencias

- `chart.js`: Librería de gráficos base
- `react-chartjs-2`: Wrapper de React para Chart.js
- `@/components/ui`: Componentes base de shadcn/ui
- `@/lib/utils/currency`: Utilidades de formateo de moneda
- `@/hooks/useMetrics`: Hooks para obtener datos de métricas

## Configuración de Colores

Los gráficos utilizan una paleta de colores consistente:

- **Verde** (`#22c55e`): Ingresos, tendencias positivas
- **Rojo** (`#ef4444`): Gastos, tendencias negativas  
- **Azul** (`#3b82f6`): Balance neto, datos principales
- **Colores de Categorías**: Paleta de 10 colores para categorías de gastos

## Optimización de Rendimiento

- Lazy loading de Chart.js components
- Memoización de datos de gráficos
- Debouncing en actualizaciones de datos
- Caching con React Query (5 minutos para métricas)