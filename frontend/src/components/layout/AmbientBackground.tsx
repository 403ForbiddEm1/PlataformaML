import React from 'react';
import {
  Laptop,
  FileText,
  FileCheck2,
  Briefcase,
  Folder,
  Cpu,
  FileSpreadsheet,
  Terminal,
  Award,
  Layers,
  Database,
  ClipboardCheck,
} from 'lucide-react';

interface VectorParticle {
  id: number;
  Icon: React.ElementType;
  top: string;
  left: string;
  size: number;
  duration: string;
  delay: string;
  dx: string;
  dy: string;
  rot: string;
  tone: 'lime' | 'blue' | 'lime-bright';
}

const VECTOR_ITEMS: VectorParticle[] = [
  { id: 1, Icon: Laptop, top: '8%', left: '6%', size: 16, duration: '7.5s', delay: '0s', dx: '22px', dy: '-26px', rot: '8deg', tone: 'lime-bright' },
  { id: 2, Icon: FileText, top: '16%', left: '22%', size: 14, duration: '8.2s', delay: '1.1s', dx: '-18px', dy: '-24px', rot: '-10deg', tone: 'lime' },
  { id: 3, Icon: Briefcase, top: '11%', left: '44%', size: 15, duration: '9.0s', delay: '2.3s', dx: '20px', dy: '-20px', rot: '6deg', tone: 'lime-bright' },
  { id: 4, Icon: FileCheck2, top: '9%', left: '68%', size: 16, duration: '7.8s', delay: '0.6s', dx: '-22px', dy: '-28px', rot: '-8deg', tone: 'lime' },
  { id: 5, Icon: Laptop, top: '14%', left: '88%', size: 17, duration: '8.6s', delay: '1.7s', dx: '-25px', dy: '18px', rot: '12deg', tone: 'blue' },
  { id: 6, Icon: Folder, top: '28%', left: '12%', size: 15, duration: '9.4s', delay: '3.0s', dx: '24px', dy: '-22px', rot: '-6deg', tone: 'lime' },
  { id: 7, Icon: FileSpreadsheet, top: '32%', left: '34%', size: 14, duration: '7.2s', delay: '0.4s', dx: '16px', dy: '-30px', rot: '9deg', tone: 'lime-bright' },
  { id: 8, Icon: Cpu, top: '26%', left: '58%', size: 15, duration: '8.8s', delay: '2.6s', dx: '-20px', dy: '-18px', rot: '-12deg', tone: 'blue' },
  { id: 9, Icon: FileText, top: '34%', left: '78%', size: 16, duration: '7.6s', delay: '1.3s', dx: '18px', dy: '-26px', rot: '7deg', tone: 'lime-bright' },
  { id: 10, Icon: ClipboardCheck, top: '42%', left: '92%', size: 15, duration: '8.4s', delay: '3.5s', dx: '-22px', dy: '-20px', rot: '-9deg', tone: 'lime' },
  { id: 11, Icon: Laptop, top: '48%', left: '7%', size: 17, duration: '8.0s', delay: '1.9s', dx: '26px', dy: '-24px', rot: '10deg', tone: 'lime-bright' },
  { id: 12, Icon: Terminal, top: '52%', left: '26%', size: 14, duration: '9.2s', delay: '0.8s', dx: '-16px', dy: '-28px', rot: '-7deg', tone: 'lime' },
  { id: 13, Icon: FileCheck2, top: '46%', left: '49%', size: 15, duration: '7.4s', delay: '2.1s', dx: '22px', dy: '-22px', rot: '8deg', tone: 'lime-bright' },
  { id: 14, Icon: Briefcase, top: '55%', left: '66%', size: 16, duration: '8.7s', delay: '0.2s', dx: '-24px', dy: '-24px', rot: '-11deg', tone: 'lime' },
  { id: 15, Icon: Laptop, top: '58%', left: '84%', size: 16, duration: '7.9s', delay: '2.8s', dx: '18px', dy: '-28px', rot: '6deg', tone: 'lime-bright' },
  { id: 16, Icon: FileText, top: '68%', left: '15%', size: 15, duration: '8.5s', delay: '1.4s', dx: '20px', dy: '-25px', rot: '-8deg', tone: 'blue' },
  { id: 17, Icon: Award, top: '72%', left: '38%', size: 15, duration: '9.1s', delay: '3.2s', dx: '-22px', dy: '-20px', rot: '10deg', tone: 'lime' },
  { id: 18, Icon: Folder, top: '66%', left: '55%', size: 14, duration: '7.7s', delay: '0.9s', dx: '18px', dy: '-28px', rot: '-6deg', tone: 'lime-bright' },
  { id: 19, Icon: Database, top: '74%', left: '74%', size: 15, duration: '8.3s', delay: '2.4s', dx: '-18px', dy: '-24px', rot: '9deg', tone: 'lime' },
  { id: 20, Icon: FileSpreadsheet, top: '78%', left: '90%', size: 16, duration: '8.9s', delay: '1.6s', dx: '-24px', dy: '-22px', rot: '-10deg', tone: 'lime-bright' },
  { id: 21, Icon: Laptop, top: '86%', left: '9%', size: 16, duration: '7.6s', delay: '0.5s', dx: '24px', dy: '-30px', rot: '7deg', tone: 'lime' },
  { id: 22, Icon: FileText, top: '88%', left: '29%', size: 15, duration: '8.1s', delay: '2.0s', dx: '-20px', dy: '-26px', rot: '-9deg', tone: 'lime-bright' },
  { id: 23, Icon: Layers, top: '84%', left: '62%', size: 15, duration: '9.3s', delay: '1.2s', dx: '22px', dy: '-24px', rot: '8deg', tone: 'blue' },
  { id: 24, Icon: ClipboardCheck, top: '90%', left: '81%', size: 16, duration: '7.8s', delay: '2.9s', dx: '-18px', dy: '-28px', rot: '-7deg', tone: 'lime-bright' },
];

const MICRO_DOTS = [
  { id: 101, top: '12%', left: '16%', size: 4, duration: '5.8s', delay: '0.3s', dx: '14px', dy: '-22px', isBlue: false },
  { id: 102, top: '22%', left: '48%', size: 5, duration: '6.4s', delay: '1.5s', dx: '-18px', dy: '-20px', isBlue: false },
  { id: 103, top: '18%', left: '76%', size: 4, duration: '7.0s', delay: '0.7s', dx: '16px', dy: '-24px', isBlue: true },
  { id: 104, top: '38%', left: '19%', size: 5, duration: '6.2s', delay: '2.2s', dx: '20px', dy: '-18px', isBlue: false },
  { id: 105, top: '44%', left: '63%', size: 4, duration: '5.9s', delay: '1.0s', dx: '-15px', dy: '-25px', isBlue: false },
  { id: 106, top: '54%', left: '39%', size: 5, duration: '6.8s', delay: '2.7s', dx: '18px', dy: '-22px', isBlue: true },
  { id: 107, top: '64%', left: '83%', size: 4, duration: '6.1s', delay: '0.4s', dx: '-20px', dy: '-19px', isBlue: false },
  { id: 108, top: '76%', left: '24%', size: 5, duration: '6.6s', delay: '1.8s', dx: '15px', dy: '-26px', isBlue: false },
  { id: 109, top: '82%', left: '52%', size: 4, duration: '5.7s', delay: '0.9s', dx: '-16px', dy: '-22px', isBlue: false },
  { id: 110, top: '91%', left: '70%', size: 5, duration: '6.5s', delay: '2.5s', dx: '19px', dy: '-24px', isBlue: true },
];

export const AmbientBackground: React.FC = () => {
  return (
    <div
      aria-hidden="true"
      className="fixed inset-0 pointer-events-none z-[1] overflow-hidden select-none"
      style={{ contain: 'strict' }}
    >
      {/* Pre-feathered ambient radial glows (zero GPU blur filter cost, identical visual glow) */}
      <div
        className="absolute -top-56 -right-56 w-[680px] h-[680px] rounded-full opacity-20 dark:opacity-15"
        style={{
          background:
            'radial-gradient(circle, rgba(200,255,69,0.55) 0%, rgba(200,255,69,0.18) 38%, transparent 72%)',
        }}
      />
      <div
        className="absolute bottom-[-18%] left-[-14%] w-[660px] h-[660px] rounded-full opacity-15 dark:opacity-12"
        style={{
          background:
            'radial-gradient(circle, rgba(76,111,255,0.55) 0%, rgba(76,111,255,0.16) 38%, transparent 72%)',
        }}
      />

      {/* Floating Vector Icons (GPU transform + opacity only, without per-frame SVG drop-shadow) */}
      {VECTOR_ITEMS.map((item) => {
        const IconComponent = item.Icon;
        const colorClass =
          item.tone === 'blue'
            ? 'text-[#4C6FFF] dark:text-[#4C6FFF]'
            : item.tone === 'lime-bright'
            ? 'text-[#5A7D00] dark:text-[#C8FF45]'
            : 'text-[#6A8E00]/90 dark:text-[#C8FF45]/85';

        return (
          <div
            key={item.id}
            className={`ambient-vector-particle absolute ${colorClass}`}
            style={
              {
                top: item.top,
                left: item.left,
                '--anim-duration': item.duration,
                '--anim-delay': item.delay,
                '--move-x': item.dx,
                '--move-y': item.dy,
                '--move-rot': item.rot,
              } as React.CSSProperties
            }
          >
            <IconComponent
              style={{ width: `${item.size}px`, height: `${item.size}px` }}
              strokeWidth={1.75}
            />
          </div>
        );
      })}

      {/* Floating Micro-Particles */}
      {MICRO_DOTS.map((dot) => (
        <span
          key={dot.id}
          className={`ambient-vector-particle absolute rounded-full ${
            dot.isBlue
              ? 'bg-[#4C6FFF] shadow-[0_0_8px_#4C6FFF]'
              : 'bg-[#6A8E00] dark:bg-[#C8FF45] shadow-[0_0_8px_#C8FF45]'
          }`}
          style={
            {
              top: dot.top,
              left: dot.left,
              width: `${dot.size}px`,
              height: `${dot.size}px`,
              '--anim-duration': dot.duration,
              '--anim-delay': dot.delay,
              '--move-x': dot.dx,
              '--move-y': dot.dy,
              '--move-rot': '0deg',
            } as React.CSSProperties
          }
        />
      ))}
    </div>
  );
};
