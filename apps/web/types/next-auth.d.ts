import 'next-auth';

declare module 'next-auth' {
  interface User {
    role: 'admin' | 'editor' | 'viewer';
  }

  interface Session {
    user: {
      id: string;
      email: string;
      name: string;
      role: 'admin' | 'editor' | 'viewer';
    };
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    id: string;
    role: 'admin' | 'editor' | 'viewer';
  }
}