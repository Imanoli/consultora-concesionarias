const logos: Record<string, string> = {
  esac: '/logos/esac.svg',
}

export function getClientLogo(clientId: string): string | null {
  return logos[clientId] ?? null
}
