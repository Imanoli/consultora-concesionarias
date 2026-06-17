const features: Record<string, { ga4: boolean; clarity: boolean }> = {
  esac: { ga4: true, clarity: true },
}

export function clientHasGa4(clientId: string): boolean {
  return features[clientId]?.ga4 ?? false
}

export function clientHasClarity(clientId: string): boolean {
  return features[clientId]?.clarity ?? false
}
