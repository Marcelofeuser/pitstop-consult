import { getFaixa } from '@/lib/calculations';

interface GaugeProps {
  value: number;
  label: string;
  size?: 'sm' | 'md' | 'lg';
}

export function IDPGauge({ value, label, size = 'md' }: GaugeProps) {
  const faixa = getFaixa(value);
  const radius = size === 'lg' ? 70 : size === 'md' ? 56 : 42;
  const strokeWidth = size === 'lg' ? 12 : size === 'md' ? 10 : 8;
  const circumference = 2 * Math.PI * radius;
  const clampedValue = Math.min(Math.max(value, 0), 100);
  const offset = circumference - (clampedValue / 100) * circumference;

  const fontSize = size === 'lg' ? 'text-3xl' : size === 'md' ? 'text-2xl' : 'text-xl';
  const dimText = size === 'lg' ? 'text-sm' : 'text-xs';

  return (
    <div className="flex flex-col items-center">
      <div className="relative" style={{ width: (radius + strokeWidth) * 2, height: (radius + strokeWidth) * 2 }}>
        <svg className="transform -rotate-90" width={(radius + strokeWidth) * 2} height={(radius + strokeWidth) * 2}>
          <circle
            cx={radius + strokeWidth}
            cy={radius + strokeWidth}
            r={radius}
            stroke="#E8EDF3"
            strokeWidth={strokeWidth}
            fill="none"
          />
          <circle
            cx={radius + strokeWidth}
            cy={radius + strokeWidth}
            r={radius}
            stroke={faixa.color}
            strokeWidth={strokeWidth}
            fill="none"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            strokeLinecap="round"
            style={{ transition: 'stroke-dashoffset 0.8s ease-out, stroke 0.4s ease' }}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className={`font-serif font-bold ${fontSize} text-navy-700`}>
            {clampedValue.toFixed(0)}
          </span>
          {size === 'lg' && (
            <span className="text-xs text-navy-400 mt-0.5">de 100</span>
          )}
        </div>
      </div>
      <p className="mt-2 text-center text-navy-600 font-medium text-sm">{label}</p>
      <span
        className={`badge mt-1 ${dimText}`}
        style={{ color: faixa.color, backgroundColor: faixa.bgColor }}
      >
        {faixa.label}
      </span>
    </div>
  );
}
