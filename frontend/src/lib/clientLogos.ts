const logos: Record<string, string> = {
  esac: '/logos/esac.jpg',
}

export function getClientLogo(clientId: string): string | null {
  return logos[clientId] ?? null
}
