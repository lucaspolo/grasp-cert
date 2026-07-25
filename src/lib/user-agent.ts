/**
 * Deriva um rótulo amigável de um User-Agent, ex.: "Chrome em Linux".
 * Heurística deliberadamente simples (sem dependência de parsing de UA):
 * cobre os casos comuns e cai num rótulo genérico para o resto.
 */
export function describeUserAgent(ua: string): string {
  if (!ua) return "Dispositivo desconhecido";

  const browser = detectBrowser(ua);
  const os = detectOS(ua);

  if (browser && os) return `${browser} em ${os}`;
  if (browser) return browser;
  if (os) return os;
  return "Dispositivo desconhecido";
}

function detectBrowser(ua: string): string | null {
  // Ordem importa: Edge e Opera se disfarçam de Chrome; Chrome de Safari.
  if (/\bEdg(?:e|A|iOS)?\//.test(ua)) return "Edge";
  if (/\bOPR\/|\bOpera\//.test(ua)) return "Opera";
  if (/\bFirefox\/|\bFxiOS\//.test(ua)) return "Firefox";
  if (/\bChrome\/|\bCriOS\//.test(ua)) return "Chrome";
  if (/\bSafari\//.test(ua)) return "Safari";
  return null;
}

function detectOS(ua: string): string | null {
  if (/\biPhone\b/.test(ua)) return "iPhone";
  if (/\biPad\b/.test(ua)) return "iPad";
  if (/\bAndroid\b/.test(ua)) return "Android";
  if (/\bWindows\b/.test(ua)) return "Windows";
  // Mac antes de Linux: o UA do macOS não contém "Linux", mas iOS contém
  // "like Mac OS X" — os checks de iPhone/iPad acima já o capturaram.
  if (/\bMac OS X\b|\bMacintosh\b/.test(ua)) return "macOS";
  if (/\bLinux\b/.test(ua)) return "Linux";
  return null;
}
