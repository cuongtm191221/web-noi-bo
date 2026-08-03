// Brand logo dùng trên trang login / branding — full size, single color (color-text-dark)

export function BrandLogo() {
  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      gap: '12px',
    }}>
      <div
        aria-label="Rikkei Education"
        style={{
          width: '48px',
          height: '48px',
          borderRadius: '8px',
          backgroundColor: 'var(--color-text-dark)',
          color: 'white',
          fontWeight: 800,
          fontSize: '28px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontFamily: 'var(--font-sans)',
          letterSpacing: '-0.02em',
        }}
      >
        R
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', lineHeight: 1.1 }}>
        <span style={{
          fontWeight: 800,
          fontSize: '20px',
          letterSpacing: '-0.01em',
          color: 'var(--color-text-dark)',
        }}>
          Rikkei Education
        </span>
        <span style={{
          fontSize: '11px',
          fontWeight: 500,
          color: 'var(--color-text-muted)',
          letterSpacing: '0.05em',
          textTransform: 'uppercase',
        }}>
          Internal Knowledge Hub
        </span>
      </div>
    </div>
  );
}