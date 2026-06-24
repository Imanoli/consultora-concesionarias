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
        const email    = credentials.email    as string
        const password = credentials.password as string

        // Admin por env vars
        if (
          email    === process.env.AUTH_USER_EMAIL &&
          password === process.env.AUTH_USER_PASSWORD
        ) {
          return { id: '0', email, name: email, role: 'admin', clientId: null }
        }

        // Usuarios cliente por env var CLIENT_USERS_JSON
        const clientUsers = getClientUsers()
        const match = clientUsers.find(u => u.email === email && u.password === password)
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
