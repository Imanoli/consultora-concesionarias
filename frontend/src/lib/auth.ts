import NextAuth from 'next-auth'
import Credentials from 'next-auth/providers/credentials'

interface ClientUser {
  email:    string
  password: string
  role:     string
  clientId: string | null
}

function getClientUsers(): ClientUser[] {
  try {
    return JSON.parse(process.env.CLIENT_USERS_JSON ?? '[]') as ClientUser[]
  } catch {
    return []
  }
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [
    Credentials({
      credentials: {
        email:    { label: 'Usuario',    type: 'text' },
        password: { label: 'Contraseña', type: 'password' },
      },
      async authorize(credentials) {
        const email    = ((credentials.email    as string) ?? '').trim()
        const password = ((credentials.password as string) ?? '').trim()

        // Admin
        if (
          email    === (process.env.AUTH_USER_EMAIL    ?? '').trim() &&
          password === (process.env.AUTH_USER_PASSWORD ?? '').trim()
        ) {
          return { id: '0', email, name: email, role: 'admin', clientId: null }
        }

        // Usuarios cliente desde CLIENT_USERS_JSON
        const match = getClientUsers().find(
          u => u.email.trim() === email && u.password.trim() === password
        )
        if (match) {
          return { id: match.email, email: match.email, name: match.email, role: match.role, clientId: match.clientId }
        }

        return null
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
