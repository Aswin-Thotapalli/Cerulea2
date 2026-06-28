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
          borderRadius: 80,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>

          {/* ── C-ring mark ── */}
          <svg
            width="130"
            height="130"
            viewBox="0 0 64 64"
            xmlns="http://www.w3.org/2000/svg"
          >
            {/* Green — bottom arc  (lower-right → lower-left, clockwise) */}
            <path
              d="M47.56,47.56 A22,22,0,0,1,16.44,47.56"
              stroke="#22C55E"
              strokeWidth="10"
              strokeLinecap="round"
              fill="none"
            />
            {/* Blue — left arc   (lower-left  → upper-left,  clockwise) */}
            <path
              d="M16.44,47.56 A22,22,0,0,1,16.44,16.44"
              stroke="#2563EB"
              strokeWidth="10"
              strokeLinecap="round"
              fill="none"
            />
            {/* Yellow — top arc  (upper-left  → upper-right, clockwise) */}
            <path
              d="M16.44,16.44 A22,22,0,0,1,47.56,16.44"
              stroke="#F59E0B"
              strokeWidth="10"
              strokeLinecap="round"
              fill="none"
            />
          </svg>

          {/* ── Wordmark ── */}
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: 0,
              lineHeight: 1,
            }}
          >
            <span
              style={{
                fontSize: 84,
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
                fontSize: 36,
                fontWeight: 300,
                color: 'rgba(255,255,255,0.82)',
                letterSpacing: 6,
                paddingLeft: 3,
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
