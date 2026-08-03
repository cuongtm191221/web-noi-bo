import NextAuth from 'next-auth';
import Credentials from 'next-auth/providers/credentials';
import { z } from 'zod';
import { prisma } from './prisma';
import { verifyPassword } from './auth-helpers';

const credentialsSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export const { handlers, auth, signIn, signOut } = NextAuth({
  // Trust host when behind a reverse proxy (Nginx). Required for Next.js
  // behind a load balancer — without this, callback URLs break.
  trustHost: true,
  session: {
    strategy: 'jwt',
    // Cookie config — force secure in production
    ...(process.env.NODE_ENV === 'production'
      ? {
          cookies: {
            sessionToken: {
              options: { secure: true, sameSite: 'lax' as const },
            },
          },
        }
      : {}),
  },
  pages: {
    signIn: '/login',
  },
  providers: [
    Credentials({
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(rawCredentials) {
        const parsed = credentialsSchema.safeParse(rawCredentials);
        if (!parsed.success) return null;

        const { email, password } = parsed.data;
        const user = await prisma.user.findUnique({ where: { email } });
        if (!user) return null;

        const isValid = await verifyPassword(password, user.passwordHash);
        if (!isValid) return null;

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user, trigger }) {
      if (user) {
        token.id = user.id;
        token.role = user.role;
        token.iat = Math.floor(Date.now() / 1000);
      }
      // On subsequent calls, refresh role from DB (every 60s max)
      if (token.id && (trigger === 'update' || !token.lastCheck || Date.now() / 1000 - (token.lastCheck as number) > 60)) {
        const { prisma } = await import('./prisma');
        const fresh = await prisma.user.findUnique({
          where: { id: token.id as string },
          select: { role: true, deactivatedAt: true, updatedAt: true },
        });
        if (fresh) {
          token.role = fresh.role;
          token.deactivatedAt = fresh.deactivatedAt?.toISOString() ?? null;
          // If user was updated AFTER JWT issue, force re-auth
          if (fresh.updatedAt && token.iat) {
            const updatedSeconds = Math.floor(fresh.updatedAt.getTime() / 1000);
            if (updatedSeconds > (token.iat as number)) {
              // Signal: invalidate this JWT
              token.id = undefined;
            }
          }
        }
        token.lastCheck = Math.floor(Date.now() / 1000);
      }
      return token;
    },
    async session({ session, token }) {
      if (token && session.user) {
        if (!token.id) {
          // JWT invalidated — return null session to force logout
          return { ...session, user: undefined as unknown as typeof session.user };
        }
        session.user.id = token.id as string;
        session.user.role = token.role as 'admin' | 'editor' | 'viewer';
      }
      return session;
    },
  },
});