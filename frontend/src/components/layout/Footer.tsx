import React, { useState } from 'react';
import { ShieldCheck, HelpCircle } from 'lucide-react';
import { SupportTicketModal } from '@/components/support/SupportTicketModal';

export const Footer: React.FC = () => {
  const [isSupportOpen, setIsSupportOpen] = useState(false);

  return (
    <footer className="border-t border-[#777873]/25 dark:border-[#F1F2EC]/10 bg-[#F1F2EC]/65 dark:bg-[#090A0C]/75 backdrop-blur-xl py-3.5 sm:py-4 mt-auto">
      <div className="max-w-7xl 2xl:max-w-[1560px] mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-2.5 sm:gap-4 text-xs text-[#777873] text-center sm:text-left">
        <div className="flex items-center gap-2">
          <span className="font-semibold text-[#090A0C] dark:text-[#F1F2EC]">© 2026 PlataformaML</span>
          <span>·</span>
          <span>Selección ética de talento con Inteligencia Artificial</span>
        </div>

        <div className="flex items-center gap-5">
          <a
            href="#privacidad"
            onClick={(e) => {
              e.preventDefault();
              alert(
                'Aviso de Privacidad y Cumplimiento Ético:\nLos datos de postulación son procesados de forma confidencial. Los modelos de Machine Learning no utilizan género, edad ni datos sensibles en sus variables de afinidad.'
              );
            }}
            className="hover:text-[#4C6FFF] dark:hover:text-[#C8FF45] transition-colors flex items-center gap-1.5 cursor-pointer font-medium"
          >
            <ShieldCheck className="w-3.5 h-3.5 text-[#4C6FFF] dark:text-[#C8FF45]" />
            <span>Aviso de privacidad</span>
          </a>

          <button
            type="button"
            onClick={() => setIsSupportOpen(true)}
            className="press hover:text-[#0B5D46] dark:hover:text-[#C8FF45] transition-colors flex items-center gap-1.5 cursor-pointer font-semibold"
          >
            <HelpCircle className="w-3.5 h-3.5 text-[#0B5D46] dark:text-[#4C6FFF]" />
            <span>Soporte</span>
          </button>
        </div>
      </div>

      <SupportTicketModal
        isOpen={isSupportOpen}
        onClose={() => setIsSupportOpen(false)}
        defaultModule="Catálogo de Convocatorias Abiertas"
      />
    </footer>
  );
};
