import React from 'react';
import { BrandLogo } from '@/components/ui/BrandLogo';

interface StatsLoaderOverlayProps {
  /** Si el overlay de transición está montado en el DOM */
  isMounted: boolean;
  /** true cuando se está desvaneciendo suavemente para revelar la página ya lista */
  isExiting: boolean;
  /** Contexto visual: entrada tras login o cierre de sesión */
  mode: 'login-enter' | 'logout-exit';
}

/**
 * Pantalla de carga de transición a 60 FPS (exclusiva para post-login y logout).
 * Replica el cargador de barras estadísticas con esfera rebotando usando únicamente
 * `transform` y `opacity` acelerados por GPU para evitar refujos de layout.
 */
export const StatsLoaderOverlay: React.FC<StatsLoaderOverlayProps> = ({
  isMounted,
  isExiting,
  mode,
}) => {
  if (!isMounted) return null;

  const isEnteringWorkspace = mode === 'login-enter';

  return (
    <div
      role="status"
      aria-live="polite"
      aria-label={isEnteringWorkspace ? 'Cargando panel de PlataformaML' : 'Cerrando sesión'}
      className={`fixed inset-0 z-[120] flex flex-col items-center justify-center bg-[#F1F2EC] dark:bg-[#090A0C] text-[#090A0C] dark:text-[#F1F2EC] select-none transition-[opacity,transform] duration-400 ease-[cubic-bezier(0.22,1,0.36,1)] will-change-[opacity,transform] ${
        isExiting
          ? 'opacity-0 scale-[1.03] pointer-events-none'
          : 'opacity-100 scale-100'
      }`}
    >
      {/* Sutil iluminación ambiental sin blur dinámico costoso */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 overflow-hidden"
      >
        <div
          className="absolute -top-24 -right-24 w-[420px] h-[420px] rounded-full opacity-25 dark:opacity-18"
          style={{
            background: 'radial-gradient(circle, rgba(200,255,69,0.55) 0%, transparent 68%)',
          }}
        />
        <div
          className="absolute -bottom-24 -left-24 w-[420px] h-[420px] rounded-full opacity-25 dark:opacity-20"
          style={{
            background: 'radial-gradient(circle, rgba(76,111,255,0.55) 0%, transparent 68%)',
          }}
        />
      </div>

      {/* Contenedor central */}
      <div
        className={`relative z-10 flex flex-col items-center gap-6 px-6 transition-[opacity,transform] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] ${
          isExiting ? 'opacity-0 -translate-y-3 scale-95' : 'opacity-100 translate-y-0 scale-100'
        }`}
      >
        {/* Insignia superior discreta */}
        <div className="flex items-center gap-2.5 px-3.5 py-1.5 rounded-full bg-[#090A0C]/6 dark:bg-[#F1F2EC]/6 border border-[#090A0C]/12 dark:border-[#F1F2EC]/12">
          <BrandLogo className="w-5 h-5 rounded-md p-0.5" />
          <span className="font-heading text-xs font-bold tracking-tight">PlataformaML</span>
        </div>

        {/* Icono de Estadística con Bolita Bajando/Rebotando (100% GPU: transform scaleY + translate3d) */}
        <div className="flex flex-col items-center gap-3.5 py-2">
          <div className="relative w-[76px] h-[68px] flex items-end justify-between pt-4">
            {/* Esfera rebotando por encima de las barras */}
            <span
              aria-hidden="true"
              className="stats-loader-ball absolute top-4 left-0 w-[10px] h-[10px] rounded-full bg-[#4C6FFF] dark:bg-[#C8FF45] shadow-[0_0_12px_rgba(76,111,255,0.45)] dark:shadow-[0_0_14px_rgba(200,255,69,0.6)] will-change-transform"
            />

            {/* 5 Barras estadísticas */}
            <span className="stats-loader-bar stats-loader-bar-1 w-[10px] h-[52px] rounded-t-sm bg-[#090A0C] dark:bg-[#F1F2EC] origin-bottom will-change-transform" />
            <span className="stats-loader-bar stats-loader-bar-2 w-[10px] h-[52px] rounded-t-sm bg-[#090A0C]/85 dark:bg-[#F1F2EC]/85 origin-bottom will-change-transform" />
            <span className="stats-loader-bar stats-loader-bar-3 w-[10px] h-[52px] rounded-t-sm bg-[#4C6FFF] origin-bottom will-change-transform" />
            <span className="stats-loader-bar stats-loader-bar-4 w-[10px] h-[52px] rounded-t-sm bg-[#4C6FFF]/85 dark:bg-[#C8FF45]/85 origin-bottom will-change-transform" />
            <span className="stats-loader-bar stats-loader-bar-5 w-[10px] h-[52px] rounded-t-sm bg-[#C8FF45] border border-[#090A0C]/15 dark:border-transparent origin-bottom will-change-transform" />
          </div>

          <div className="text-center space-y-1">
            <p className="font-mono-tabular text-xs font-bold tracking-[0.28em] uppercase text-[#090A0C] dark:text-[#C8FF45]">
              CARGANDO
            </p>
            <p className="text-xs text-[#777873] font-medium">
              {isEnteringWorkspace
                ? 'Preparando módulos, animaciones y activos del panel...'
                : 'Cerrando sesión y limpiando entorno de acceso...'}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
