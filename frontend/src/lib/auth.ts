import NextAuth from 'next-auth'
import Credentials from 'next-auth/providers/credentials'

const BACKEND = process.env.BACKEND_URL ?? process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001'

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [
    Credentials({
      credentials: {
        email:    { label: 'Usuario',    type: 'text' },
        password: { label: 'Contraseña', type: 'password' },
      },
      async authorize(credentials) {
        const res = await fetch(`${BACKEND}/api/auth/verify`, {
          method:  'POST',
          headers: { 'Content-Type': 'application/json' },
          body:    JSON.stringify({ email: credentials.email, password: credentials.password }),
        })
        if (!res.ok) return null
        const user = await res.json() as { id: number; email: string; role: string; clientId: string | null }
        return { id: String(user.id), email: user.email, name: user.email, role: user.role, clientId: user.clientId }
      },
    }),
  ],
  pages:   { signIn: '/login' },
  session: { strategy: 'jwt' },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.role     = (user as any).role
        token.clientId = (user as any).clientId ?? null
      }
      return token
    },
    async session({ session, token }) {
      session.user.role     = token.role as string
      session.user.clientId = (token.clientId as string | null) ?? null
      return session
    },
  },
})
