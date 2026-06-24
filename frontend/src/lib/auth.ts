import NextAuth from 'next-auth'
import Credentials from 'next-auth/providers/credentials'

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

        // Usuarios cliente: CLIENT_1_EMAIL / CLIENT_1_PASSWORD / CLIENT_1_CLIENT_ID, etc.
        for (let i = 1; i <= 20; i++) {
          const uEmail    = (process.env[`CLIENT_${i}_EMAIL`]     ?? '').trim()
          const uPassword = (process.env[`CLIENT_${i}_PASSWORD`]  ?? '').trim()
          const uClientId = (process.env[`CLIENT_${i}_CLIENT_ID`] ?? '').trim() || null
          if (!uEmail) break
          if (email === uEmail && password === uPassword) {
            return { id: uEmail, email: uEmail, name: uEmail, role: 'client', clientId: uClientId }
          }
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
