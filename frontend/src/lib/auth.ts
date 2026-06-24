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

        console.log('[auth] login attempt:', email)
        console.log('[auth] CLIENT_USERS_JSON present:', !!process.env.CLIENT_USERS_JSON)

        // Admin por env vars
        if (
          email    === process.env.AUTH_USER_EMAIL &&
          password === process.env.AUTH_USER_PASSWORD
        ) {
          return { id: '0', email, name: email, role: 'admin', clientId: null }
        }

        // Usuarios cliente por env var CLIENT_USERS_JSON
        const clientUsers = getClientUsers()
        console.log('[auth] client users count:', clientUsers.length)

        // Diagnóstico: comparación exacta carácter a carácter
        for (const u of clientUsers) {
          const emailMatch = u.email === email
          const pwMatch    = u.password === password
          console.log(`[auth] user "${u.email}": emailMatch=${emailMatch} pwMatch=${pwMatch} pwLen=${u.password.length} inputLen=${password.length}`)
          if (!pwMatch) {
            // Mostrar primeros y últimos chars sin exponer toda la contraseña
            console.log(`[auth] pw stored[0]="${u.password[0]}" input[0]="${password[0]}"`)
            console.log(`[auth] pw stored[-1]="${u.password[u.password.length-1]}" input[-1]="${password[password.length-1]}"`)
          }
        }

        const match = clientUsers.find(u => u.email === email && u.password === password)
        console.log('[auth] match found:', !!match)

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
