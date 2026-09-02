export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const { pathname } = url;

    const corsHeaders = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization'
    };

    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders });
    }

    if (pathname === '/' || pathname === '') {
      if (request.method === 'GET') {
        const html = `<!DOCTYPE html>
<html lang="fa" dir="rtl">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>کوتاه‌کننده لینک کلادفلر</title>
  <style>
    body { font-family: system-ui, -apple-system, sans-serif; background: #f8fafc; color: #1e293b; display: flex; align-items: center; justify-content: center; min-height: 100vh; margin: 0; padding: 1rem; }
    .card { background: white; padding: 2rem; border-radius: 12px; box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1); width: 100%; max-width: 480px; }
    h1 { font-size: 1.5rem; margin-top: 0; color: #0f172a; text-align: center; }
    input { width: 100%; padding: 0.75rem; border: 1px solid #cbd5e1; border-radius: 6px; box-sizing: border-box; margin: 0.5rem 0 1rem; font-size: 1rem; }
    button { width: 100%; background: #2563eb; color: white; border: none; padding: 0.75rem; border-radius: 6px; font-weight: 600; cursor: pointer; font-size: 1rem; }
    button:hover { background: #1d4ed8; }
    .result { margin-top: 1rem; padding: 0.75rem; background: #f1f5f9; border-radius: 6px; word-break: break-all; display: none; }
  </style>
</head>
<body>
  <div class="card">
    <h1>کوتاه‌کننده لینک</h1>
    <form id="shortenForm">
      <label for="longUrl">آدرس اینترنتی (URL):</label>
      <input type="url" id="longUrl" required placeholder="https://example.com/very/long/url" dir="ltr" />
      <label for="customSlug">نام مستعار دلخواه (اختیاری):</label>
      <input type="text" id="customSlug" placeholder="my-link" dir="ltr" pattern="[a-zA-Z0-9-_]+" />
      <button type="submit" id="submitBtn">کوتاه کردن لینک</button>
    </form>
    <div id="resultBox" class="result"></div>
  </div>
  <script>
    const form = document.getElementById('shortenForm');
    const resultBox = document.getElementById('resultBox');
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      resultBox.style.display = 'none';
      const url = document.getElementById('longUrl').value.trim();
      const slug = document.getElementById('customSlug').value.trim();
      try {
        const res = await fetch('/api/shorten', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ url, slug: slug || undefined })
        });
        const data = await res.json();
        if (res.ok) {
          resultBox.innerHTML = '<strong>لینک کوتاه شما:</strong><br><a href="' + data.shortUrl + '" target="_blank">' + data.shortUrl + '</a>';
          resultBox.style.color = '#15803d';
        } else {
          resultBox.textContent = 'خطا: ' + (data.error || 'خطایی رخ داد');
          resultBox.style.color = '#b91c1c';
        }
      } catch (err) {
        resultBox.textContent = 'خطای اتصال به سرور';
        resultBox.style.color = '#b91c1c';
      }
      resultBox.style.display = 'block';
    });
  </script>
</body>
</html>`;
        return new Response(html, {
          headers: { 'Content-Type': 'text/html; charset=utf-8' }
        });
      }
    }

    if (pathname === '/api/shorten' && request.method === 'POST') {
      if (!env.URL_KV) {
        return new Response(JSON.stringify({ error: 'KV namespace URL_KV is not bound.' }), {
          status: 500,
          headers: { 'Content-Type': 'application/json', ...corsHeaders }
        });
      }

      try {
        const body = await request.json();
        const longUrl = body.url ? body.url.trim() : null;
        let slug = body.slug ? body.slug.trim() : null;

        if (!longUrl) {
          return new Response(JSON.stringify({ error: 'URL is required' }), {
            status: 400,
            headers: { 'Content-Type': 'application/json', ...corsHeaders }
          });
        }

        try {
          new URL(longUrl);
        } catch (_) {
          return new Response(JSON.stringify({ error: 'Invalid URL format' }), {
            status: 400,
            headers: { 'Content-Type': 'application/json', ...corsHeaders }
          });
        }

        if (slug) {
          if (!/^[a-zA-Z0-9-_]+$/.test(slug)) {
            return new Response(JSON.stringify({ error: 'Slug can only contain letters, numbers, hyphens, and underscores' }), {
              status: 400,
              headers: { 'Content-Type': 'application/json', ...corsHeaders }
            });
          }
          const existing = await env.URL_KV.get(slug);
          if (existing) {
            return new Response(JSON.stringify({ error: 'Custom slug already in use' }), {
              status: 409,
              headers: { 'Content-Type': 'application/json', ...corsHeaders }
            });
          }
        } else {
          const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
          let attempts = 0;
          while (attempts < 5) {
            let randomSlug = '';
            const bytes = new Uint8Array(6);
            crypto.getRandomValues(bytes);
            for (let i = 0; i < 6; i++) {
              randomSlug += chars[bytes[i] % chars.length];
            }
            const existing = await env.URL_KV.get(randomSlug);
            if (!existing) {
              slug = randomSlug;
              break;
            }
            attempts++;
          }
          if (!slug) {
            return new Response(JSON.stringify({ error: 'Failed to generate unique slug, please try again' }), {
              status: 500,
              headers: { 'Content-Type': 'application/json', ...corsHeaders }
            });
          }
        }

        await env.URL_KV.put(slug, longUrl);

        const shortUrl = `${url.origin}/${slug}`;
        return new Response(JSON.stringify({ success: true, slug, shortUrl, originalUrl: longUrl }), {
          status: 201,
          headers: { 'Content-Type': 'application/json', ...corsHeaders }
        });
      } catch (err) {
        return new Response(JSON.stringify({ error: 'Invalid JSON request payload' }), {
          status: 400,
          headers: { 'Content-Type': 'application/json', ...corsHeaders }
        });
      }
    }

    const slugKey = pathname.slice(1);
    if (slugKey && slugKey !== 'favicon.ico') {
      if (!env.URL_KV) {
        return new Response('KV URL_KV binding missing', { status: 500 });
      }
      const targetUrl = await env.URL_KV.get(slugKey);
      if (targetUrl) {
        return Response.redirect(targetUrl, 302);
      }
      return new Response('404 Not Found: Short link does not exist.', { status: 404 });
    }

    return new Response('Not Found', { status: 404 });
  }
};