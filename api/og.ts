import type { VercelRequest, VercelResponse } from '@vercel/node';

function pickMeta(html: string, selectors: RegExp[]) {
  for (const re of selectors) {
    const m = html.match(re);
    if (m?.[1]) return m[1].trim();
  }
  return null;
}

function normalizeUrl(u: string) {
  try {
    return new URL(u).toString();
  } catch {
    return null;
  }
}

async function fetchHtmlWithUA(target: string, userAgent: string) {
  const r = await fetch(target, {
    redirect: 'follow',
    headers: {
      'User-Agent': userAgent,
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      'Accept-Language': 'pt-BR,pt;q=0.9,en;q=0.8',
      // Alguns sites mudam a resposta sem referer
      'Referer': 'https://www.google.com/',
      'Cache-Control': 'no-cache',
      'Pragma': 'no-cache',
    },
  });

  const status = r.status;
  const text = await r.text();
  return { status, text };
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    const urlRaw = typeof req.query.url === 'string' ? req.query.url : '';
    const target = normalizeUrl(urlRaw);

    if (!target) {
      res.status(400).json({ error: 'Missing or invalid url' });
      return;
    }

    // ✅ Ordem importante: primeiro tenta como WhatsApp/Facebook crawler (o que você disse que funciona)
    const UAS = [
      // WhatsApp costuma usar algo próximo disso
      'WhatsApp/2.24.0 i',
      // Facebook crawler clássico (muitos previews são gerados por ele)
      'facebookexternalhit/1.1 (+http://www.facebook.com/externalhit_uatext.php)',
      // Fallback navegador comum
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
    ];

    let html = '';
    let ok = false;
    let lastStatus = 0;

    for (const ua of UAS) {
      const { status, text } = await fetchHtmlWithUA(target, ua);
      lastStatus = status;
      html = text || '';

      // Se já vier com og:image/og:title, paramos
      const hasOg =
        /property=["']og:image["']/.test(html) ||
        /property=["']og:title["']/.test(html) ||
        /name=["']twitter:image["']/.test(html);

      if (status >= 200 && status < 400 && hasOg) {
        ok = true;
        break;
      }
    }

    // Mesmo que não “ok”, tentamos extrair algo do que veio
    const title =
      pickMeta(html, [
        /<meta\s+property=["']og:title["']\s+content=["']([^"']+)["']\s*\/?>/i,
        /<meta\s+name=["']twitter:title["']\s+content=["']([^"']+)["']\s*\/?>/i,
        /<title>([^<]+)<\/title>/i,
      ]) || null;

    const image =
      pickMeta(html, [
        /<meta\s+property=["']og:image["']\s+content=["']([^"']+)["']\s*\/?>/i,
        /<meta\s+property=["']og:image:url["']\s+content=["']([^"']+)["']\s*\/?>/i,
        /<meta\s+name=["']twitter:image["']\s+content=["']([^"']+)["']\s*\/?>/i,
      ]) || null;

    // Cache leve
    res.setHeader('Cache-Control', 's-maxage=1800, stale-while-revalidate=86400');

    // Se a página veio bloqueada e não achamos nada, devolve status pra diagnosticar
    res.status(200).json({
      title,
      image,
      debug: {
        fetched: ok,
        lastStatus,
        // Só para diagnóstico: se veio HTML “suspeito” (robot check), geralmente aparece essas palavras
        looksBlocked:
          /captcha|robot|verify|cloudflare|attention required|access denied/i.test(html),
      },
    });
  } catch (e: any) {
    res.status(500).json({ error: e?.message || 'Unknown error' });
  }
}