import { BRAND, BRAND_COLORS } from '@/lib/constants/brand'
import { cn } from '@/lib/utils'

type BrandMarkVariant = 'full' | 'compact' | 'icon'
type BrandMarkTheme = 'default' | 'inverse'

interface BrandMarkProps {
  variant?: BrandMarkVariant
  theme?: BrandMarkTheme
  className?: string
}

const wrapperStyles: Record<BrandMarkVariant, string> = {
  full: 'flex-col items-start gap-4',
  compact: 'flex-row items-center gap-3',
  icon: 'flex-row items-center gap-0',
}

const symbolStyles: Record<BrandMarkVariant, string> = {
  full: 'h-[5.8rem] w-[5.8rem]',
  compact: 'h-[3.75rem] w-[3.75rem]',
  icon: 'h-[3.1rem] w-[3.1rem]',
}

const titleStyles: Record<BrandMarkVariant, string> = {
  full: 'text-[2.05rem] tracking-[0.12em]',
  compact: 'text-[1.22rem] tracking-[0.12em]',
  icon: 'hidden',
}

const descriptorStyles: Record<BrandMarkVariant, string> = {
  full: 'text-[0.76rem] tracking-[0.34em]',
  compact: 'text-[0.58rem] tracking-[0.28em]',
  icon: 'hidden',
}

function BrandSymbol({
  variant,
  theme,
}: {
  variant: BrandMarkVariant
  theme: BrandMarkTheme
}) {
  const inverse = theme === 'inverse'
  const navy = inverse ? '#F7F2E8' : BRAND_COLORS.navy
  const gold = BRAND_COLORS.gold
  const goldDeep = BRAND_COLORS.goldDeep
  const goldSoft = BRAND_COLORS.goldSoft
  const mist = inverse ? 'rgba(255,255,255,0.10)' : 'rgba(20,38,63,0.08)'

  return (
    <div className={cn('relative isolate shrink-0', symbolStyles[variant])} aria-hidden="true">
      <div
        className={cn(
          'absolute inset-0 rounded-[32%] blur-2xl',
          inverse ? 'bg-[radial-gradient(circle,rgba(241,224,184,0.22),transparent_68%)]' : 'bg-[radial-gradient(circle,rgba(200,155,85,0.18),transparent_68%)]'
        )}
      />
      <svg viewBox="0 0 120 120" className="relative z-10 h-full w-full overflow-visible">
        <defs>
          <linearGradient id="jp-arrow-fill" x1="18" y1="86" x2="95" y2="24" gradientUnits="userSpaceOnUse">
            <stop offset="0" stopColor={goldDeep} />
            <stop offset="0.42" stopColor={goldSoft} />
            <stop offset="1" stopColor={gold} />
          </linearGradient>
          <linearGradient id="jp-arrow-stroke" x1="25" y1="78" x2="92" y2="24" gradientUnits="userSpaceOnUse">
            <stop offset="0" stopColor="#6F4D1D" />
            <stop offset="1" stopColor="#E9D6A7" />
          </linearGradient>
          <radialGradient id="jp-flare" cx="0" cy="0" r="1" gradientUnits="userSpaceOnUse" gradientTransform="translate(70 46) rotate(35) scale(45 24)">
            <stop offset="0" stopColor={goldSoft} stopOpacity="0.95" />
            <stop offset="1" stopColor={goldSoft} stopOpacity="0" />
          </radialGradient>
        </defs>

        <path
          d="M8 28 C26 18, 38 16, 50 22"
          stroke={mist}
          strokeWidth="1.4"
          strokeLinecap="round"
          fill="none"
        />
        <path
          d="M8 41 C26 33, 44 31, 62 38"
          stroke={mist}
          strokeWidth="1.2"
          strokeLinecap="round"
          fill="none"
        />
        <path
          d="M62 22 C88 18, 103 28, 111 42"
          stroke={mist}
          strokeWidth="1.4"
          strokeLinecap="round"
          fill="none"
        />
        <path
          d="M61 10v70h-12V20H23v-10h38Z"
          fill={navy}
          opacity="0.98"
        />
        <path
          d="M67 10h24c11 0 18 2 22 6c4 3 6 8 6 15c0 9-2 15-7 19c-5 4-11 6-21 6H79v24H67V10Zm12 10v26h12c7 0 11-1 14-3c2-2 4-5 4-10c0-5-1-8-4-10c-3-2-8-3-15-3H79Z"
          fill={navy}
          opacity="0.98"
        />

        <ellipse cx="61" cy="58" rx="35" ry="18" fill="url(#jp-flare)" opacity="0.95" />
        <path
          d="M25 70C37 76 52 69 70 51l7-7-10-2 24-15-8 27-5-8-8 8C56 68 43 79 27 79c-1 0-2 0-3-1l1-8Z"
          fill="url(#jp-arrow-fill)"
          stroke="url(#jp-arrow-stroke)"
          strokeWidth="1.6"
          strokeLinejoin="round"
        />
        <path
          d="M27 71c14 4 30-5 48-24"
          stroke={goldSoft}
          strokeWidth="4.5"
          strokeLinecap="round"
          opacity="0.36"
        />
        <circle cx="88" cy="35" r="1.3" fill={goldSoft} opacity="0.9" />
        <circle cx="96" cy="40" r="1.1" fill={gold} opacity="0.75" />
        <circle cx="26" cy="79" r="1.15" fill={goldDeep} opacity="0.55" />
      </svg>
    </div>
  )
}

export function BrandMark({
  variant = 'full',
  theme = 'default',
  className,
}: BrandMarkProps) {
  const inverse = theme === 'inverse'

  return (
    <div className={cn('flex', wrapperStyles[variant], className)}>
      <BrandSymbol variant={variant} theme={theme} />

      {variant !== 'icon' && (
        <div className={cn('min-w-0', variant === 'full' ? 'space-y-1' : 'space-y-0.5')}>
          <p
            className={cn(
              'truncate font-sans font-extrabold uppercase leading-none',
              titleStyles[variant],
              inverse ? 'text-white' : 'text-[#14263f]'
            )}
          >
            {BRAND.shortName}
          </p>
          <p
            className={cn(
              'truncate font-sans font-semibold uppercase leading-none',
              descriptorStyles[variant],
              inverse ? 'text-[#f1e0b8]' : 'text-[#42536a]'
            )}
          >
            {BRAND.descriptor}
          </p>
        </div>
      )}
    </div>
  )
}
