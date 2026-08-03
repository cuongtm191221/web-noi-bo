export function Logo({ className }: { className?: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }} className={className}>
      <div
        aria-label="Rikkei Education"
        style={{
          width: '32px',
          height: '32px',
          borderRadius: '6px',
          backgroundColor: 'white',
          color: 'var(--color-text-dark)',
          fontWeight: 800,
          fontSize: '18px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontFamily: 'var(--font-sans)',
          letterSpacing: '-0.02em',
        }}
      >
        R
      </div>
      <span style={{ fontWeight: 700, fontSize: '15px', color: 'white' }}>
        Rikkei Education
      </span>
    </div>
  );
}