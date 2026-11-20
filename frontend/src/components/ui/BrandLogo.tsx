import React from 'react';
import logoPng from '@/assets/brand/logo.png';

interface BrandLogoProps {
  className?: string;
  imgClassName?: string;
  alt?: string;
}

/**
 * Logo oficial de PlataformaML basado en el archivo PNG organizado en src/assets/brand/logo.png.
 */
export const BrandLogo: React.FC<BrandLogoProps> = ({
  className = 'w-9 h-9 rounded-xl p-1.5',
  imgClassName = 'w-full h-full object-contain',
  alt = 'Logo PlataformaML',
}) => {
  return (
    <div
      className={`bg-[#C8FF45] border border-[#C8FF45]/60 flex items-center justify-center shadow-[0_0_16px_rgba(200,255,69,0.28)] shrink-0 overflow-hidden ${className}`}
    >
      <img src={logoPng} alt={alt} className={imgClassName} />
    </div>
  );
};
