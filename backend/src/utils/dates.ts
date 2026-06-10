// Argentina = UTC-3 fijo (sin DST — no usa horario de verano)
export function yesterdayArgentina(): string {
  const now = new Date()
  const arg = new Date(now.getTime() - 3 * 60 * 60 * 1000)
  arg.setUTCDate(arg.getUTCDate() - 1)
  return arg.toISOString().split('T')[0]
}
