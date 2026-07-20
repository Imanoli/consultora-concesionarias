const features: Record<string, { ga4: boolean; clarity: boolean; presupuestador: boolean }> = {
  esac:   { ga4: true,  clarity: true,  presupuestador: false },
  dakota: { ga4: false, clarity: false, presupuestador: true },
}

export function clientHasGa4(clientId: string): boolean {
  return features[clientId]?.ga4 ?? false
}

export function clientHasClarity(clientId: string): boolean {
  return features[clientId]?.clarity ?? false
}

export function clientHasPresupuestador(clientId: string): boolean {
  return features[clientId]?.presupuestador ?? false
}
