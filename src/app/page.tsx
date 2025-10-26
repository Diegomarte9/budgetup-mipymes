export default function Home() {
  return (
    <div className='min-h-screen bg-background'>
      <main className='container mx-auto px-4 py-16'>
        <div className='mx-auto max-w-2xl space-y-8 text-center'>
          <div className='space-y-4'>
            <h1 className='text-4xl font-bold text-foreground'>
              BudgetUp para MiPymes
            </h1>
            <p className='text-xl text-muted-foreground'>
              Gestión financiera simple y efectiva para micro y pequeñas
              empresas dominicanas
            </p>
          </div>

          <div className='grid gap-4 md:grid-cols-2'>
            <div className='rounded-lg border bg-card p-6 shadow-sm'>
              <h3 className='mb-2 text-lg font-semibold'>
                Configuración Completa
              </h3>
              <p className='text-sm text-muted-foreground'>
                Next.js 16 con App Router, TypeScript y Tailwind CSS
                configurados
              </p>
            </div>

            <div className='rounded-lg border bg-card p-6 shadow-sm'>
              <h3 className='mb-2 text-lg font-semibold'>shadcn/ui Ready</h3>
              <p className='text-sm text-muted-foreground'>
                Sistema de componentes preparado para desarrollo rápido
              </p>
            </div>
          </div>

          <div className='pt-8'>
            <p className='text-sm text-muted-foreground'>
              Proyecto base configurado correctamente. Listo para implementar
              las funcionalidades de BudgetUp.
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}
