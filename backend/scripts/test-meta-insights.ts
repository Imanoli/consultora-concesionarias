// Smoke test — fetchCampaignInsights
// Uso: npx tsx scripts/test-meta-insights.ts
import 'dotenv/config'
import { fetchCampaignInsights, MetaApiError } from '../src/services/metaApi.js'
import { yesterdayArgentina } from '../src/utils/dates.js'

async function main() {
  const date = yesterdayArgentina()
  console.log(`\n— Meta Insights Smoke Test —`)
  console.log(`Fecha consultada (ayer ARG): ${date}\n`)

  try {
    const insights = await fetchCampaignInsights(date)
    console.log(`Campañas con datos: ${insights.length}`)

    if (insights.length > 0) {
      console.log('\nPrimera entrada (raw):')
      console.log(JSON.stringify(insights[0], null, 2))
    } else {
      console.log('Sin datos para esa fecha (posible que no hubo actividad ayer).')
    }
  } catch (err) {
    if (err instanceof MetaApiError) {
      console.error(`Error de Meta API [${err.code}]: ${err.message}`)
    } else {
      console.error(err)
    }
    process.exit(1)
  }
}

main()
