import Image from 'next/image';

export function Logo({ className }: { className?: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }} className={className}>
      <Image
        src="/rikkei-logo.svg"
        alt="Rikkei Education"
        width={40}
        height={40}
        style={{ height: '40px', width: 'auto' }}
        priority
      />
      <span style={{ fontWeight: 700, fontSize: '18px', color: 'var(--color-primary)' }}>Rikkei Education</span>
    </div>
  );
}
