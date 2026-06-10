// Smoke test — Meta Ads connection
// Uso: npx tsx scripts/test-meta-connection.ts
import 'dotenv/config'

const TOKEN   = process.env.META_ACCESS_TOKEN
const ACCOUNT = process.env.META_AD_ACCOUNT_ID
const VERSION = process.env.META_GRAPH_API_VERSION ?? 'v21.0'
const APP_ID  = process.env.META_APP_ID

const missing = ['META_ACCESS_TOKEN', 'META_AD_ACCOUNT_ID', 'META_APP_ID']
  .filter(k => !process.env[k])
if (missing.length) {
  console.error('Faltan variables en .env:', missing.join(', '))
  process.exit(1)
}

const BASE = `https://graph.facebook.com/${VERSION}`

async function main() {
  console.log(`\n— Meta Smoke Test —`)
  console.log(`API version : ${VERSION}`)
  console.log(`App ID      : ${APP_ID}`)
  console.log(`Ad Account  : ${ACCOUNT}\n`)

  const url = new URL(`${BASE}/${ACCOUNT}`)
  url.searchParams.set('fields', 'id,name,currency,account_status,timezone_name')
  url.searchParams.set('access_token', TOKEN!)

  console.log(`GET ${BASE}/${ACCOUNT}?fields=id,name,currency,account_status,timezone_name`)

  const res  = await fetch(url.toString())
  const data = await res.json() as Record<string, unknown>

  if (data['error']) {
    const err = data['error'] as { code: number; message: string }
    console.error(`\nError de API — código ${err.code}: ${err.message}`)
    process.exit(1)
  }

  console.log('\nRespuesta:')
  console.log(JSON.stringify(data, null, 2))
  console.log('\nSmoke test OK — token y cuenta válidos.')
}

main().catch(e => { console.error(e); process.exit(1) })
