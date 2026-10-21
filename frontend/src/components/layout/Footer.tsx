import React from 'react';
import { ShieldCheck, HelpCircle } from 'lucide-react';

export const Footer: React.FC = () => {
  return (
    <footer className="border-t border-slate-200/80 bg-white py-6 mt-auto">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500">
        <div className="flex items-center gap-2">
          <span>© 2026 Nexo Tecnología</span>
          <span>·</span>
          <span>Conectamos talento y oportunidades con Inteligencia Artificial</span>
        </div>

        <div className="flex items-center gap-6">
          <a
            href="#privacidad"
            onClick={(e) => {
              e.preventDefault();
              alert(
                'Aviso de Privacidad y Cumplimiento RNF02/RNF03:\nLos datos de postulación son procesados de forma confidencial. Los modelos de Machine Learning no utilizan género, edad ni datos sensibles en sus variables de afinidad.'
              );
            }}
            className="hover:text-emerald-600 transition-colors flex items-center gap-1"
          >
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
            <span>Aviso de privacidad</span>
          </a>

          <a
            href="#ayuda"
            onClick={(e) => {
              e.preventDefault();
              alert('Soporte Nexo Tecnología:\nPara consultas o asistencia técnica: soporte@nexotecnologia.com o vía WhatsApp al +1 (809) 555-0199.');
            }}
            className="hover:text-emerald-600 transition-colors flex items-center gap-1"
          >
            <HelpCircle className="w-3.5 h-3.5" />
            <span>¿Necesitas ayuda?</span>
          </a>
        </div>
      </div>
    </footer>
  );
};
