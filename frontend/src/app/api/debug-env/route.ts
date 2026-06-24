export async function GET() {
  const raw = process.env.CLIENT_USERS_JSON ?? null
  let users: Array<{ email: string; role: string; clientId: string | null }> = []
  let parseError: string | null = null

  if (raw) {
    try {
      const parsed = JSON.parse(raw)
      users = (parsed as Array<{ email: string; password: string; role: string; clientId: string | null }>)
        .map(u => ({ email: u.email, role: u.role, clientId: u.clientId }))
    } catch (e) {
      parseError = String(e)
    }
  }

  return Response.json({
    CLIENT_USERS_JSON_set: !!raw,
    CLIENT_USERS_JSON_length: raw?.length ?? 0,
    users,
    parseError,
  })
}
