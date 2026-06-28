import { ImageResponse } from 'next/og';

export const size = { width: 512, height: 512 };
export const contentType = 'image/png';

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: 512,
          height: 512,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'linear-gradient(135deg, #080E24 0%, #0d1640 100%)',
          borderRadius: 72,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 18 }}>

          {/* ── C-ring ── */}
          <svg
            width="170"
            height="170"
            viewBox="0 0 64 64"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path d="M47.56,47.56 A22,22,0,0,1,16.44,47.56" stroke="#22C55E" strokeWidth="10" strokeLinecap="round" fill="none" />
            <path d="M16.44,47.56 A22,22,0,0,1,16.44,16.44" stroke="#2563EB" strokeWidth="10" strokeLinecap="round" fill="none" />
            <path d="M16.44,16.44 A22,22,0,0,1,47.56,16.44" stroke="#F59E0B" strokeWidth="10" strokeLinecap="round" fill="none" />
          </svg>

          {/* ── Wordmark ── */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <span
              style={{
                fontSize: 80,
                fontWeight: 900,
                color: '#60a5fa',
                letterSpacing: -2,
                lineHeight: 1,
              }}
            >
              Cerulea
            </span>
            <span
              style={{
                fontSize: 38,
                fontWeight: 300,
                color: '#94a3b8',
                letterSpacing: 7,
                paddingLeft: 2,
                lineHeight: 1,
              }}
            >
              Studio
            </span>
          </div>

        </div>
      </div>
    ),
    { width: 512, height: 512 },
  );
}
