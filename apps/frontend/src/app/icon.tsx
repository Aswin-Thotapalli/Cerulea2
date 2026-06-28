import { ImageResponse } from 'next/og';

export const size = { width: 64, height: 64 };
export const contentType = 'image/png';

// Draws the Cerulea C mark: a 270° ring split into three 90° colored arcs,
// opening on the right side. Center (32,32), radius 22, stroke 10.
//
// Arc endpoints at 45° intervals on the circle:
//   315° (upper-right): (47.56, 16.44)
//   225° (upper-left):  (16.44, 16.44)
//   135° (lower-left):  (16.44, 47.56)
//    45° (lower-right): (47.56, 47.56)
//
// Segments drawn clockwise (sweep=1), each 90°, large-arc=0:
//   Green  — bottom: lower-right → lower-left
//   Blue   — left:   lower-left  → upper-left
//   Yellow — top:    upper-left  → upper-right
// Gap (transparent, the "opening" of the C): upper-right → lower-right

export default function Icon() {
  return new ImageResponse(
    (
      <div style={{ width: 64, height: 64, display: 'flex' }}>
        <svg width="64" height="64" viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg">
          <path d="M47.56,47.56 A22,22,0,0,1,16.44,47.56" stroke="#22C55E" strokeWidth="10" strokeLinecap="round" fill="none" />
          <path d="M16.44,47.56 A22,22,0,0,1,16.44,16.44" stroke="#2563EB" strokeWidth="10" strokeLinecap="round" fill="none" />
          <path d="M16.44,16.44 A22,22,0,0,1,47.56,16.44" stroke="#F59E0B" strokeWidth="10" strokeLinecap="round" fill="none" />
        </svg>
      </div>
    ),
    { ...size },
  );
}
