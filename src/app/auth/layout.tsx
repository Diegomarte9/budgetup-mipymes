export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className='relative min-h-screen overflow-hidden bg-gradient-to-br from-black via-gray-900 to-black'>
      {/* Photographic lighting effects */}
      <div className='absolute inset-0'>
        {/* Main dramatic lighting */}
        <div className='absolute inset-0 bg-gradient-to-br from-gray-900/60 via-black/80 to-gray-900/60' />

        {/* Key light - top left (enhanced) */}
        <div className='bg-white/8 absolute left-0 top-0 h-[500px] w-[500px] rounded-full blur-3xl' />
        <div className='bg-white/4 absolute left-10 top-10 h-96 w-96 rounded-full blur-2xl' />

        {/* Fill light - bottom right with enhanced red accent */}
        <div className='bg-red-500/12 absolute bottom-0 right-0 h-[400px] w-[400px] animate-pulse rounded-full blur-3xl delay-1000' />
        <div className='bg-red-400/6 delay-1500 absolute bottom-10 right-10 h-80 w-80 animate-pulse rounded-full blur-2xl' />

        {/* Rim light - center (enhanced) */}
        <div className='bg-gray-300/4 absolute left-1/2 top-1/2 h-80 w-80 -translate-x-1/2 -translate-y-1/2 transform animate-pulse rounded-full blur-3xl delay-500' />

        {/* Spotlight effect around form area */}
        <div className='bg-white/3 absolute left-1/2 top-1/2 h-[400px] w-[600px] -translate-x-1/2 -translate-y-1/2 transform rounded-full blur-3xl' />

        {/* Enhanced grid pattern */}
        <div className='absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.08)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.08)_1px,transparent_1px)] bg-[size:80px_80px]' />

        {/* Film grain effect */}
        <div className='absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(255,255,255,0.1)_1px,transparent_1px)] bg-[size:2px_2px] opacity-20' />

        {/* Additional atmospheric effects */}
        <div className='bg-white/2 delay-2000 absolute right-1/3 top-1/4 h-32 w-32 animate-pulse rounded-full blur-xl' />
        <div className='bg-red-300/3 delay-3000 absolute bottom-1/3 left-1/4 h-24 w-24 animate-pulse rounded-full blur-lg' />

        {/* Vignette effect */}
        <div className='absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_0%,transparent_50%,black/20_100%)]' />
      </div>

      {/* Content */}
      <div className='relative z-10 flex min-h-screen flex-col'>
        {/* Main content area */}
        <div className='flex flex-1 items-center justify-center px-4 py-12 sm:px-6 lg:px-8'>
          <div className='w-full max-w-md space-y-8'>
            {/* Logo and title */}
            <div className='space-y-4 text-center'>
              <div className='relative'>
                <h1 className='bg-gradient-to-r from-white via-gray-200 to-red-300 bg-clip-text text-4xl font-bold text-transparent'>
                  BudgetUp
                </h1>
                <div className='absolute -inset-1 -z-10 rounded-lg bg-gradient-to-r from-white/10 to-red-500/10 blur-lg' />
              </div>
              <p className='text-sm font-medium text-gray-300'>
                Gestión financiera para MiPymes
              </p>
            </div>

            {/* Form container with enhanced cinematic lighting */}
            <div className='relative'>
              {/* Key light from top-left */}
              <div className='absolute -left-8 -top-8 h-32 w-32 rounded-full bg-white/15 blur-2xl' />

              {/* Fill light from bottom-right with red accent */}
              <div className='absolute -bottom-6 -right-6 h-24 w-24 animate-pulse rounded-full bg-red-500/20 blur-xl delay-700' />

              {/* Rim light around the form */}
              <div className='from-white/8 via-red-500/12 to-white/8 absolute -inset-2 rounded-xl bg-gradient-to-r blur-lg' />

              {/* Secondary rim light for depth */}
              <div className='absolute -inset-1 rounded-lg bg-gradient-to-br from-gray-400/15 via-transparent to-red-400/10 blur-md' />

              {/* Main form container */}
              <div className='relative rounded-lg border border-gray-700/30 bg-gray-900/60 shadow-2xl shadow-black/60 backdrop-blur-xl'>
                {children}
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <footer className='relative z-10 px-4 pb-6'>
          <div className='text-center'>
            <div className='flex items-center justify-center space-x-2 text-sm text-gray-400'>
              <span>Hecho por Diego Marte en República Dominicana</span>
              <span className='text-lg'>🇩🇴</span>
            </div>
          </div>
        </footer>
      </div>
    </div>
  );
}
