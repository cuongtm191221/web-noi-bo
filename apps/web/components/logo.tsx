import Image from 'next/image';

export function Logo({ className }: { className?: string }) {
  return (
    <div className={`flex items-center gap-2 ${className ?? ''}`}>
      <Image
        src="/rikkei-logo.svg"
        alt="Rikkei Education"
        width={40}
        height={40}
        className="h-10 w-auto"
        priority
      />
      <span className="font-bold text-lg text-primary">Rikkei Education</span>
    </div>
  );
}
