'use client';

import { useState, useTransition } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { signIn } from 'next-auth/react';
import { BrandLogo } from '@/components/brand-logo';

export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get('callbackUrl') ?? '/documents';
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    startTransition(async () => {
      const result = await signIn('credentials', {
        email,
        password,
        redirect: false,
      });

      if (result?.error) {
        setError('Email hoặc mật khẩu không đúng.');
      } else {
        router.push(callbackUrl);
        router.refresh();
      }
    });
  };

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: 'var(--color-bg-cream)',
      padding: '16px',
    }}>
      <div style={{
        width: '100%',
        maxWidth: '448px',
        backgroundColor: 'white',
        borderRadius: '12px',
        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -2px rgba(0, 0, 0, 0.05)',
        padding: '32px',
        border: '1px solid var(--color-border)',
      }}>
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '32px' }}>
          <BrandLogo />
        </div>

        <h1 style={{ fontSize: '24px', fontWeight: '700', color: 'var(--color-primary)', marginBottom: '8px' }}>
          Đăng nhập
        </h1>
        <p style={{ fontSize: '14px', color: 'var(--color-text-muted)', marginBottom: '24px' }}>
          Hệ thống quản lý tài liệu nội bộ Rikkei Education
        </p>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div>
            <label htmlFor="email" style={{ display: 'block', fontSize: '14px', fontWeight: '600', marginBottom: '4px' }}>
              Email
            </label>
            <input
              id="email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              style={{
                width: '100%',
                padding: '8px 12px',
                borderRadius: '6px',
                border: '1px solid var(--color-border)',
                outline: 'none',
                fontSize: '14px',
              }}
              placeholder="admin@rikkei.edu.vn"
            />
          </div>

          <div>
            <label htmlFor="password" style={{ display: 'block', fontSize: '14px', fontWeight: '600', marginBottom: '4px' }}>
              Mật khẩu
            </label>
            <input
              id="password"
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              style={{
                width: '100%',
                padding: '8px 12px',
                borderRadius: '6px',
                border: '1px solid var(--color-border)',
                outline: 'none',
                fontSize: '14px',
              }}
              placeholder="••••••••"
            />
          </div>

          {error && (
            <div style={{
              fontSize: '14px',
              color: '#dc2626',
              backgroundColor: '#fef2f2',
              padding: '8px 12px',
              borderRadius: '6px',
            }}>
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={isPending}
            style={{
              width: '100%',
              fontWeight: '600',
              padding: '10px 16px',
              borderRadius: '6px',
              backgroundColor: 'var(--color-primary)',
              color: 'white',
              border: 'none',
              cursor: 'pointer',
              fontSize: '14px',
              opacity: isPending ? 0.5 : 1,
            }}
          >
            {isPending ? 'Đang đăng nhập...' : 'Đăng nhập'}
          </button>
        </form>

        <p style={{ fontSize: '12px', color: 'var(--color-text-muted)', marginTop: '24px', textAlign: 'center' }}>
          Liên hệ admin để được cấp tài khoản
        </p>
      </div>
    </div>
  );
}
