# Cloudflare KV URL Shortener

یک سرویس کوتاه کننده لینک با کارایی بسیار بالا، بدون سرور (Serverless) و با تأخیر نزدیک به صفر با استفاده از Cloudflare Workers و Cloudflare KV.

## ویژگی‌ها
- ریدایرکت سریع `302` بر اساس شناسه لینک از KV
- API برای ساخت لینک‌های کوتاه جدید با متد `POST /api/shorten`
- پشتیبانی از اسلاگ (Slug) سفارشی یا تولید خودکار شناسه تصادفی امن
- دارای رابط کاربری وب (UI) شیک و ساده در صفحه اصلی (`GET /`)
- پشتیبانی کامل از CORS

## پیش‌نیازها و راه‌اندازی

1. نصب Wrangler:
```bash
npm install -g wrangler
```

2. لاگین در اکانت Cloudflare:
```bash
wrangler login
```

3. ساخت KV Namespace برای ذخیره لینک‌ها:
```bash
wrangler kv:namespace create "URL_KV"
wrangler kv:namespace create "URL_KV" --preview
```

4. مقادیر `id` و `preview_id` دریافت شده از دستور قبل را در فایل `wrangler.toml` جایگزین کنید.

5. تست محلی:
```bash
npm run dev
```

6. انتشار روی کلادفلر:
```bash
npm run deploy
```

## نحوه استفاده از API

### ساخت لینک کوتاه جدید
```bash
curl -X POST https://kv-url-shortener.<your-subdomain>.workers.dev/api/shorten \
  -H "Content-Type: application/json" \
  -d '{"url": "https://github.com", "slug": "gh"}'
```

پاسخ:
```json
{
  "success": true,
  "slug": "gh",
  "shortUrl": "https://kv-url-shortener.<your-subdomain>.workers.dev/gh",
  "originalUrl": "https://github.com"
}
```