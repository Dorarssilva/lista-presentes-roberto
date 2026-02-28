import type { VercelRequest, VercelResponse } from '@vercel/node';

function normalizeUrl(u: string) {
  try {
    const url = new URL(u);
    if (!['http:', 'https:'].includes(url.protocol)) return null;
    return url.toString();
  } catch {
    return null;
  }
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    const urlRaw = typeof req.query.url === 'string' ? req.query.url : '';
    const target = normalizeUrl(urlRaw);

    if (!target) {
      res.status(400).send('Missing or invalid url');
      return;
    }

    const r = await fetch(target, {
      redirect: 'follow',
      headers: {
        // crawler-ish
        'User-Agent':
          'facebookexternalhit/1.1 (+http://www.facebook.com/externalhit_uatext.php)',
        'Accept': 'image/avif,image/webp,image/apng,image/*,*/*;q=0.8',
        'Accept-Language': 'pt-BR,pt;q=0.9,en;q=0.8',
        // Muitos CDNs liberam com algum referer
        'Referer': 'https://shopee.com.br/',
        'Cache-Control': 'no-cache',
        'Pragma': 'no-cache',
      },
    });

    if (!r.ok) {
      res.status(502).send(`Failed to fetch image: ${r.status}`);
      return;
    }

    const contentType = r.headers.get('content-type') || 'image/jpeg';

    // Se por algum motivo veio HTML (bloqueio/captcha), não adianta devolver como imagem
    if (contentType.includes('text/html')) {
      res.status(502).send('Image host returned HTML (blocked/hotlink-protection).');
      return;
    }

    res.setHeader('Content-Type', contentType);
    res.setHeader(
      'Cache-Control',
      'public, max-age=86400, s-maxage=86400, stale-while-revalidate=604800'
    );

    const arrayBuffer = await r.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    res.status(200).send(buffer);
  } catch (e: any) {
    res.status(500).send(e?.message || 'Unknown error');
  }
}