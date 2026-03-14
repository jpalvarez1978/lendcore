import { ImageResponse } from 'next/og'

export const size = {
  width: 64,
  height: 64,
}

export const contentType = 'image/png'

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          display: 'flex',
          width: '100%',
          height: '100%',
          alignItems: 'center',
          justifyContent: 'center',
          background:
            'linear-gradient(145deg, #172B46 0%, #13233A 68%, #0D1727 100%)',
          borderRadius: 18,
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            position: 'absolute',
            inset: 0,
            background:
              'radial-gradient(circle at 76% 30%, rgba(200,155,85,0.36), transparent 40%)',
          }}
        />
        <div
          style={{
            position: 'absolute',
            width: 38,
            height: 38,
            borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(241,224,184,0.45), transparent 70%)',
            transform: 'translate(9px, -6px)',
          }}
        />
        <div
          style={{
            position: 'absolute',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#F7F2E8',
            fontSize: 34,
            fontWeight: 800,
            letterSpacing: -4,
            fontFamily: 'Arial, sans-serif',
          }}
        >
          JP
        </div>
        <div
          style={{
            position: 'absolute',
            width: 30,
            height: 7,
            borderRadius: 999,
            background: 'linear-gradient(90deg, #A97B36 0%, #F1E0B8 48%, #C89B55 100%)',
            transform: 'translate(-2px, 10px) rotate(-32deg)',
            boxShadow: '0 0 14px rgba(241,224,184,0.55)',
          }}
        />
        <div
          style={{
            position: 'absolute',
            width: 0,
            height: 0,
            borderTop: '8px solid transparent',
            borderBottom: '8px solid transparent',
            borderLeft: '15px solid #EEDBAF',
            transform: 'translate(12px, -1px) rotate(-32deg)',
            filter: 'drop-shadow(0 0 10px rgba(241,224,184,0.45))',
          }}
        />
      </div>
    ),
    size
  )
}
