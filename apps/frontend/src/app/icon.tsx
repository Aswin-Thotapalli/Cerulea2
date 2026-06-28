import { ImageResponse } from 'next/og';

export const size = { width: 512, height: 512 };
export const contentType = 'image/png';

// Full Cerulea Studio wordmark, transparent background, horizontal layout.
// C-ring: three 90° clockwise arcs opening on the right.
// Center (32,32), radius 22, stroke 10.
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
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 22 }}>

          {/* ── C-ring ── */}
          <svg
            width="180"
            height="180"
            viewBox="0 0 64 64"
            xmlns="http://www.w3.org/2000/svg"
          >
            {/* Green — bottom (lower-right → lower-left, cw) */}
            <path d="M47.56,47.56 A22,22,0,0,1,16.44,47.56" stroke="#22C55E" strokeWidth="10" strokeLinecap="round" fill="none" />
            {/* Blue — left (lower-left → upper-left, cw) */}
            <path d="M16.44,47.56 A22,22,0,0,1,16.44,16.44" stroke="#2563EB" strokeWidth="10" strokeLinecap="round" fill="none" />
            {/* Yellow — top (upper-left → upper-right, cw) */}
            <path d="M16.44,16.44 A22,22,0,0,1,47.56,16.44" stroke="#F59E0B" strokeWidth="10" strokeLinecap="round" fill="none" />
          </svg>

          {/* ── Wordmark ── */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <span
              style={{
                fontSize: 82,
                fontWeight: 900,
                color: '#2563EB',
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
                color: '#475569',
                letterSpacing: 6,
                paddingLeft: 2,
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
