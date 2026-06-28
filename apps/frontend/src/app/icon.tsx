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
          background: '#ffffff',
          padding: '0 8px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>

          <svg width="140" height="140" viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg">
            <path d="M47.56,47.56 A22,22,0,0,1,16.44,47.56" stroke="#22C55E" strokeWidth="10" strokeLinecap="round" fill="none" />
            <path d="M16.44,47.56 A22,22,0,0,1,16.44,16.44" stroke="#2563EB" strokeWidth="10" strokeLinecap="round" fill="none" />
            <path d="M16.44,16.44 A22,22,0,0,1,47.56,16.44" stroke="#F59E0B" strokeWidth="10" strokeLinecap="round" fill="none" />
          </svg>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <span style={{ fontSize: 88, fontWeight: 900, color: '#1e3a8a', letterSpacing: -2, lineHeight: 1 }}>
              Cerulea
            </span>
            <span style={{ fontSize: 40, fontWeight: 300, color: '#64748b', letterSpacing: 6, paddingLeft: 2, lineHeight: 1 }}>
              Studio
            </span>
          </div>

        </div>
      </div>
    ),
    { width: 512, height: 512 },
  );
}
