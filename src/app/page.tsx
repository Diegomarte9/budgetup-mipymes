export default function Home() {
  return (
    <div className="min-h-screen bg-background">
      <main className="container mx-auto px-4 py-16">
        <div className="max-w-2xl mx-auto text-center space-y-8">
          <div className="space-y-4">
            <h1 className="text-4xl font-bold text-foreground">
              BudgetUp para MiPymes
            </h1>
            <p className="text-xl text-muted-foreground">
              Gestión financiera simple y efectiva para micro y pequeñas empresas dominicanas
            </p>
          </div>
          
          <div className="grid gap-4 md:grid-cols-2">
            <div className="p-6 bg-card border rounded-lg shadow-sm">
              <h3 className="text-lg font-semibold mb-2">Configuración Completa</h3>
              <p className="text-sm text-muted-foreground">
                Next.js 16 con App Router, TypeScript y Tailwind CSS configurados
              </p>
            </div>
            
            <div className="p-6 bg-card border rounded-lg shadow-sm">
              <h3 className="text-lg font-semibold mb-2">shadcn/ui Ready</h3>
              <p className="text-sm text-muted-foreground">
                Sistema de componentes preparado para desarrollo rápido
              </p>
            </div>
          </div>

          <div className="pt-8">
            <p className="text-sm text-muted-foreground">
              Proyecto base configurado correctamente. Listo para implementar las funcionalidades de BudgetUp.
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}
