/**
 * Genera un nuevo Refresh Token para Google Ads.
 * Uso: node scripts/getRefreshToken.js
 * Abre el navegador → autorizá → el token se imprime en consola.
 */
const http   = require('http')
const { exec } = require('child_process')

require('dotenv').config({ path: require('path').join(__dirname, '../.env') })

const CLIENT_ID     = process.env.GOOGLE_ADS_CLIENT_ID
const CLIENT_SECRET = process.env.GOOGLE_ADS_CLIENT_SECRET
const REDIRECT_URI  = 'http://localhost:8080/callback'
const SCOPE         = 'https://www.googleapis.com/auth/adwords'

const authUrl = new URL('https://accounts.google.com/o/oauth2/v2/auth')
authUrl.searchParams.set('client_id',     CLIENT_ID)
authUrl.searchParams.set('redirect_uri',  REDIRECT_URI)
authUrl.searchParams.set('response_type', 'code')
authUrl.searchParams.set('scope',         SCOPE)
authUrl.searchParams.set('access_type',   'offline')
authUrl.searchParams.set('prompt',        'consent')

console.log('\nAbriendo navegador para autorizar Google Ads...')
console.log('Si no se abre automáticamente, copiá esta URL:\n')
console.log(authUrl.toString())
console.log()

exec(`start "" "${authUrl.toString()}"`)

const server = http.createServer(async (req, res) => {
  const url    = new URL(req.url, 'http://localhost:8080')
  const code   = url.searchParams.get('code')
  const errMsg = url.searchParams.get('error')

  if (errMsg) {
    res.end(`<h2>Error: ${errMsg}</h2>`)
    server.close()
    process.exit(1)
  }

  if (!code) { res.end('Esperando...'); return }

  res.end('<h2>¡Autorizado! Podés cerrar esta pestaña.</h2>')
  server.close()

  // Intercambiar code por tokens
  const tokenResp = await fetch('https://oauth2.googleapis.com/token', {
    method:  'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body:    new URLSearchParams({
      code,
      client_id:     CLIENT_ID,
      client_secret: CLIENT_SECRET,
      redirect_uri:  REDIRECT_URI,
      grant_type:    'authorization_code',
    }),
  })
  const tokens = await tokenResp.json()

  if (tokens.error) {
    console.error('Error al obtener tokens:', tokens)
    process.exit(1)
  }

  console.log('=== NUEVO REFRESH TOKEN ===')
  console.log(tokens.refresh_token)
  console.log('===========================')
  console.log('\nAgregalo al .env como:')
  console.log(`GOOGLE_ADS_REFRESH_TOKEN=${tokens.refresh_token}`)
  process.exit(0)
})

server.listen(8080, () => console.log('Servidor local en http://localhost:8080 — esperando autorización...'))
