const logos: Record<string, string> = {
  esac:      '/logos/esac.png',
  dakota:    '/logos/dakota.png',
  cg:        '/logos/cg.png',
  caradvice: '/logos/caradvice.jpg',
}

export function getClientLogo(clientId: string): string | null {
  return logos[clientId] ?? null
}
