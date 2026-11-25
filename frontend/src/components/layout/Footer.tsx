import React, { useState } from 'react';
import { ShieldCheck, HelpCircle, Mail } from 'lucide-react';
import { SupportTicketModal } from '@/components/support/SupportTicketModal';

const GITHUB_REPO_URL = 'https://github.com/403ForbiddEm1/PlataformaML';

const GitHubIcon: React.FC<{ className?: string }> = ({ className = 'w-3.5 h-3.5' }) => (
  <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" className={className}>
    <path
      fillRule="evenodd"
      clipRule="evenodd"
      d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.53 1.032 1.53 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"
    />
  </svg>
);

export const Footer: React.FC = () => {
  const [isSupportOpen, setIsSupportOpen] = useState(false);

  return (
    <footer className="border-t border-[#777873]/25 dark:border-[#F1F2EC]/10 bg-[#F1F2EC]/65 dark:bg-[#090A0C]/75 backdrop-blur-xl py-3.5 sm:py-4 mt-auto">
      <div className="max-w-7xl 2xl:max-w-[1560px] mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-3 sm:gap-4 text-xs text-[#777873] text-center sm:text-left">
        <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
          <span className="font-semibold text-[#090A0C] dark:text-[#F1F2EC]">© 2026 PlataformaML</span>
          <span>·</span>
          <span>Selección ética de talento con Inteligencia Artificial</span>
        </div>

        <div className="flex flex-wrap items-center justify-center gap-4 sm:gap-5">
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

          <a
            href="mailto:contacto@plataformaml.com"
            className="hover:text-[#4C6FFF] dark:hover:text-[#C8FF45] transition-colors flex items-center gap-1.5 font-medium"
          >
            <Mail className="w-3.5 h-3.5 text-[#4C6FFF] dark:text-[#C8FF45]" />
            <span>Contacto</span>
          </a>

          <button
            type="button"
            onClick={() => setIsSupportOpen(true)}
            className="press hover:text-[#0B5D46] dark:hover:text-[#C8FF45] transition-colors flex items-center gap-1.5 cursor-pointer font-semibold"
          >
            <HelpCircle className="w-3.5 h-3.5 text-[#0B5D46] dark:text-[#4C6FFF]" />
            <span>Soporte</span>
          </button>

          <a
            href={GITHUB_REPO_URL}
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Repositorio de PlataformaML en GitHub"
            className="hover:text-[#090A0C] dark:hover:text-[#C8FF45] transition-colors inline-flex items-center gap-1.5 font-semibold"
          >
            <GitHubIcon className="w-4 h-4" />
            <span>GitHub</span>
          </a>
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
