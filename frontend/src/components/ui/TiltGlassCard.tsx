import React, { useEffect, useRef } from 'react';

interface TiltGlassCardProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Maximum 3D tilt angle in degrees on hover. Keep small (1.5-3.5) for minimal tactile tilt. */
  maxTiltDeg?: number;
  /** Visual radius & elevation class overrides if needed. */
  children: React.ReactNode;
}

/**
 * Floating container combining frosted glassmorphism, dual-shadow neumorphism,
 * and a minimal pointer-reactive 3D perspective tilt with soft specular sheen.
 * Updates DOM transforms directly inside requestAnimationFrame so pointer
 * movement causes zero React re-renders.
 */
export const TiltGlassCard: React.FC<TiltGlassCardProps> = ({
  maxTiltDeg = 3.2,
  className = '',
  style,
  children,
  onMouseMove,
  onMouseLeave,
  ...rest
}) => {
  const cardRef = useRef<HTMLDivElement | null>(null);
  const glareRef = useRef<HTMLDivElement | null>(null);
  const rafIdRef = useRef<number | null>(null);
  const pointerRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const isActiveRef = useRef(false);

  useEffect(() => {
    return () => {
      if (rafIdRef.current !== null) {
        window.cancelAnimationFrame(rafIdRef.current);
      }
    };
  }, []);

  const flushTilt = () => {
    rafIdRef.current = null;
    const el = cardRef.current;
    if (!el || !isActiveRef.current) return;

    const rect = el.getBoundingClientRect();
    if (!rect.width || !rect.height) return;

    const px = (pointerRef.current.x - rect.left) / rect.width;
    const py = (pointerRef.current.y - rect.top) / rect.height;

    const clampedX = Math.max(0, Math.min(1, px));
    const clampedY = Math.max(0, Math.min(1, py));

    const rx = (0.5 - clampedY) * (maxTiltDeg * 2);
    const ry = (clampedX - 0.5) * (maxTiltDeg * 2);

    el.style.transition = 'transform 110ms cubic-bezier(0.22, 1, 0.36, 1)';
    el.style.transform = `perspective(950px) rotateX(${rx.toFixed(2)}deg) rotateY(${ry.toFixed(2)}deg) translateZ(4px)`;

    const glare = glareRef.current;
    if (glare) {
      glare.style.opacity = '1';
      glare.style.background = `radial-gradient(360px circle at ${(clampedX * 100).toFixed(1)}% ${(clampedY * 100).toFixed(1)}%, rgba(255,255,255,0.14), transparent 62%)`;
    }
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    onMouseMove?.(e);
    if (typeof window !== 'undefined' && !window.matchMedia('(hover: hover) and (pointer: fine)').matches) {
      return;
    }
    pointerRef.current.x = e.clientX;
    pointerRef.current.y = e.clientY;
    isActiveRef.current = true;

    if (rafIdRef.current === null) {
      rafIdRef.current = window.requestAnimationFrame(flushTilt);
    }
  };

  const handleMouseLeave = (e: React.MouseEvent<HTMLDivElement>) => {
    onMouseLeave?.(e);
    isActiveRef.current = false;

    if (rafIdRef.current !== null) {
      window.cancelAnimationFrame(rafIdRef.current);
      rafIdRef.current = null;
    }

    const el = cardRef.current;
    if (el) {
      el.style.transition = 'transform 420ms cubic-bezier(0.22, 1, 0.36, 1)';
      el.style.transform = 'perspective(950px) rotateX(0deg) rotateY(0deg) translateZ(0px)';
    }

    const glare = glareRef.current;
    if (glare) {
      glare.style.opacity = '0';
    }
  };

  return (
    <div
      ref={cardRef}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      style={{
        transform: 'perspective(950px) rotateX(0deg) rotateY(0deg) translateZ(0px)',
        transition: 'transform 420ms cubic-bezier(0.22, 1, 0.36, 1)',
        transformStyle: 'preserve-3d',
        contain: 'layout style',
        ...style,
      }}
      className={[
        'relative overflow-hidden will-change-transform',
        // Glassmorphism surface + crisp translucent edge (blur-md cuts GPU sample area 4x vs blur-xl)
        'bg-white/55 dark:bg-white/[0.045] backdrop-blur-md',
        'border border-white/75 dark:border-white/15',
        // Neumorphism raised dual shadows + subtle inner bevel highlight
        'shadow-[8px_12px_26px_rgba(15,23,42,0.12),-5px_-5px_14px_rgba(255,255,255,0.72),inset_1px_1px_0_rgba(255,255,255,0.85),inset_-1px_-1px_0_rgba(15,23,42,0.05)]',
        'dark:shadow-[10px_14px_30px_rgba(0,0,0,0.62),-5px_-5px_16px_rgba(255,255,255,0.035),inset_1px_1px_0_rgba(255,255,255,0.15),inset_-1px_-1px_0_rgba(0,0,0,0.45)]',
        className,
      ].join(' ')}
      {...rest}
    >
      {/* Subtle cursor-tracked glass specular glare */}
      <div
        ref={glareRef}
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 transition-opacity duration-300"
        style={{ opacity: 0 }}
      />
      {children}
    </div>
  );
};
