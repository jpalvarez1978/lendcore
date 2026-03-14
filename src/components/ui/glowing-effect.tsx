'use client'

import { memo, useCallback, useEffect, useRef, type CSSProperties } from 'react'
import { animate } from 'motion/react'
import { cn } from '@/lib/utils'

interface GlowingEffectProps {
  blur?: number
  inactiveZone?: number
  proximity?: number
  spread?: number
  variant?: 'default' | 'white'
  glow?: boolean
  className?: string
  disabled?: boolean
  movementDuration?: number
  borderWidth?: number
}

const GlowingEffect = memo(
  ({
    blur = 0,
    inactiveZone = 0.7,
    proximity = 0,
    spread = 20,
    variant = 'default',
    glow = false,
    className,
    movementDuration = 2,
    borderWidth = 1,
    disabled = true,
  }: GlowingEffectProps) => {
    const containerRef = useRef<HTMLDivElement>(null)
    const lastPosition = useRef({ x: 0, y: 0 })
    const animationFrameRef = useRef<number>(0)

    const handleMove = useCallback(
      (e?: MouseEvent | PointerEvent | { x: number; y: number }) => {
        if (!containerRef.current) return

        if (animationFrameRef.current) {
          cancelAnimationFrame(animationFrameRef.current)
        }

        animationFrameRef.current = requestAnimationFrame(() => {
          const element = containerRef.current
          if (!element) return

          const { left, top, width, height } = element.getBoundingClientRect()
          const mouseX = e?.x ?? lastPosition.current.x
          const mouseY = e?.y ?? lastPosition.current.y

          if (e) {
            lastPosition.current = { x: mouseX, y: mouseY }
          }

          const center = [left + width * 0.5, top + height * 0.5]
          const distanceFromCenter = Math.hypot(mouseX - center[0], mouseY - center[1])
          const inactiveRadius = 0.5 * Math.min(width, height) * inactiveZone

          if (distanceFromCenter < inactiveRadius) {
            element.style.setProperty('--active', '0')
            return
          }

          const isActive =
            mouseX > left - proximity &&
            mouseX < left + width + proximity &&
            mouseY > top - proximity &&
            mouseY < top + height + proximity

          element.style.setProperty('--active', isActive ? '1' : '0')

          if (!isActive) return

          const currentAngle = parseFloat(element.style.getPropertyValue('--start')) || 0
          const targetAngle =
            (180 * Math.atan2(mouseY - center[1], mouseX - center[0])) / Math.PI + 90

          const angleDiff = ((targetAngle - currentAngle + 180) % 360) - 180
          const newAngle = currentAngle + angleDiff

          animate(currentAngle, newAngle, {
            duration: movementDuration,
            ease: [0.16, 1, 0.3, 1],
            onUpdate: value => {
              element.style.setProperty('--start', String(value))
            },
          })
        })
      },
      [inactiveZone, proximity, movementDuration]
    )

    useEffect(() => {
      if (disabled) return

      const handleScroll = () => handleMove()
      const handlePointerMove = (e: PointerEvent) => handleMove(e)

      window.addEventListener('scroll', handleScroll, { passive: true })
      document.body.addEventListener('pointermove', handlePointerMove, { passive: true })

      return () => {
        if (animationFrameRef.current) {
          cancelAnimationFrame(animationFrameRef.current)
        }
        window.removeEventListener('scroll', handleScroll)
        document.body.removeEventListener('pointermove', handlePointerMove)
      }
    }, [handleMove, disabled])

    return (
      <>
        <div
          className={cn(
            'pointer-events-none absolute -inset-px hidden rounded-[inherit] border opacity-0 transition-opacity duration-300',
            glow && 'opacity-100',
            variant === 'white' && 'border-white/70',
            disabled && '!block'
          )}
        />
        <div
          ref={containerRef}
          style={
            {
              '--blur': `${blur}px`,
              '--spread': spread,
              '--start': '0',
              '--active': '0',
              '--glowingeffect-border-width': `${borderWidth}px`,
              '--repeating-conic-gradient-times': '5',
              '--gradient':
                variant === 'white'
                  ? `repeating-conic-gradient(
                      from 236.84deg at 50% 50%,
                      #ffffff,
                      rgba(255,255,255,0.15) calc(25% / var(--repeating-conic-gradient-times))
                    )`
                  : `radial-gradient(circle, rgba(200,155,85,0.92) 10%, rgba(200,155,85,0) 22%),
                    radial-gradient(circle at 40% 40%, rgba(20,38,63,0.85) 5%, rgba(20,38,63,0) 16%),
                    radial-gradient(circle at 60% 60%, rgba(31,122,89,0.7) 10%, rgba(31,122,89,0) 22%),
                    radial-gradient(circle at 40% 60%, rgba(169,123,54,0.65) 10%, rgba(169,123,54,0) 21%),
                    repeating-conic-gradient(
                      from 236.84deg at 50% 50%,
                      rgba(200,155,85,0.9) 0%,
                      rgba(20,38,63,0.92) calc(25% / var(--repeating-conic-gradient-times)),
                      rgba(31,122,89,0.8) calc(50% / var(--repeating-conic-gradient-times)),
                      rgba(69,108,143,0.78) calc(75% / var(--repeating-conic-gradient-times)),
                      rgba(200,155,85,0.9) calc(100% / var(--repeating-conic-gradient-times))
                    )`,
            } as CSSProperties
          }
          className={cn(
            'pointer-events-none absolute inset-0 rounded-[inherit] opacity-100 transition-opacity',
            glow && 'opacity-100',
            blur > 0 && 'blur-[var(--blur)]',
            className,
            disabled && '!hidden'
          )}
        >
          <div
            className={cn(
              'glow rounded-[inherit]',
              'after:absolute after:inset-[calc(-1*var(--glowingeffect-border-width))] after:rounded-[inherit] after:content-[""]',
              'after:[border:var(--glowingeffect-border-width)_solid_transparent]',
              'after:[background:var(--gradient)] after:[background-attachment:fixed]',
              'after:opacity-[var(--active)] after:transition-opacity after:duration-300',
              'after:[mask-clip:padding-box,border-box]',
              'after:[mask-composite:intersect]',
              'after:[mask-image:linear-gradient(#0000,#0000),conic-gradient(from_calc((var(--start)-var(--spread))*1deg),#00000000_0deg,#fff,#00000000_calc(var(--spread)*2deg))]'
            )}
          />
        </div>
      </>
    )
  }
)

GlowingEffect.displayName = 'GlowingEffect'

export { GlowingEffect }
