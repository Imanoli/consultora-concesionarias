const logos: Record<string, string> = {
  esac:   '/logos/esac.png',
  dakota: '/logos/dakota.png',
  cg:     '/logos/cg.png',
}

export function getClientLogo(clientId: string): string | null {
  return logos[clientId] ?? null
}
