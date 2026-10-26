# UyTop Deployment

Bu hujjat UyTop frontend va API backendni serverga chiqarish uchun minimal amaliy ketma-ketlikni beradi.

## 1. Backend env

Backend `scripts/api-server-entry.js` ishga tushganda `.env.api.local` faylini avtomatik o'qiydi. Serverda `.env.api.example` asosida `.env.api.local` yarating:

```txt
HOST=0.0.0.0
API_PORT=4100
UYTOP_ALLOWED_ORIGINS=https://uytop.uz,https://www.uytop.uz
UYTOP_FRONTEND_URL=https://uytop.uz
UYTOP_DB_DRIVER=mongo
MONGODB_URI=mongodb://127.0.0.1:27017/
MONGODB_DB=uytop
UYTOP_ADMIN_PHONE=+998 99 000 00 01
UYTOP_ADMIN_PASSWORD=strong-production-password
UYTOP_SESSION_TTL_DAYS=30
UYTOP_AUTH_COOKIE_NAME=uytop_session
UYTOP_COOKIE_SECURE=true
UYTOP_SMS_PROVIDER=dev
UYTOP_SMS_WEBHOOK_URL=
UYTOP_SMS_WEBHOOK_TOKEN=
UYTOP_PAYMENT_PROVIDER=manual
UYTOP_PAYMENT_WEBHOOK_SECRET=change-this-payment-secret
UYTOP_MAX_BODY_MB=10
UYTOP_MAX_UPLOAD_FILE_MB=3
UYTOP_MIN_LISTING_IMAGE_LONG_SIDE=900
UYTOP_MIN_LISTING_IMAGE_SHORT_SIDE=480
UYTOP_UPLOAD_CLEANUP_DAYS=7
UYTOP_DB_PATH=./data/uytop.sqlite
UYTOP_BACKUP_DIR=./data/backups
UYTOP_LOG_DIR=./data/logs
```

Muhim:

- `UYTOP_ALLOWED_ORIGINS` faqat frontend domenlarini olsin.
- `UYTOP_FRONTEND_URL` backend root javobida ko'rsatiladigan frontend manzili.
- `UYTOP_DB_DRIVER=mongo` bo'lsa backend MongoDB serverga ulanadi; SQLite fallback uchun `sqlite` yoki bo'sh qoldiriladi.
- `MONGODB_URI` lokal Compass ulanishi uchun `mongodb://localhost:27017/`, productionda server connection string bo'ladi.
- `UYTOP_ADMIN_PASSWORD` productionda demo qiymatda qolmasin.
- `UYTOP_COOKIE_SECURE=true` faqat HTTPS productionda ishlating. Lokal HTTP testda `false` yoki bo'sh qoldiriladi.
- `UYTOP_SMS_PROVIDER=dev` lokal test uchun OTP kodni API javobida qaytaradi. Productionda `webhook` qiling va `UYTOP_SMS_WEBHOOK_URL` ni SMS gateway endpointiga ulang.
- `UYTOP_PAYMENT_PROVIDER=manual` lokal/demo premium workflow uchun. Click/Payme webhook qo'shilganda provider nomi va `UYTOP_PAYMENT_WEBHOOK_SECRET` alohida sozlanadi.
- `UYTOP_MAX_UPLOAD_FILE_MB` backend qabul qiladigan har bir rasmning maksimal hajmi; frontend rasmlarni bundan oldin siqadi.
- `UYTOP_MIN_LISTING_IMAGE_LONG_SIDE` va `UYTOP_MIN_LISTING_IMAGE_SHORT_SIDE` listing rasmlari detail sahifada xira ko'rinmasligi uchun minimal piksel o'lchamini belgilaydi.
- `UYTOP_UPLOAD_CLEANUP_DAYS` admin cleanup ishlaganda nechchi kundan eski, ishlatilmayotgan upload fayllar o'chirilishini belgilaydi.
- `data/` papkasi persistent diskda bo'lishi kerak.
- `UYTOP_LOG_DIR` ichida 500-darajadagi API xatolari `api-errors.log` fayliga yoziladi.

## 2. Frontend env

Builddan oldin production API URL ni bering:

```txt
REACT_APP_UYTOP_API_URL=https://api.uytop.uz
```

CRA build:

```txt
npm install
npm run build
```

`build/` papkasini statik hosting yoki reverse proxy orqali serve qiling.

## 3. Backend start

Serverda:

```txt
npm install --omit=dev
npm run api
```

Process manager ishlating. Masalan PM2:

```txt
pm2 start npm --name uytop-api -- run api
pm2 save
```

Reverse proxy `/uploads/*` va API endpointlarni backend portiga yo'naltirishi kerak. Frontend alohida domen/subdomen orqali serve qilinsa, API uchun `https://api.uytop.uz` kabi subdomen ishlating.

## 4. Backup

SQLite database va upload fayllarni backup qilish:

```txt
npm run api:backup
```

Backup `data/backups/uytop-<timestamp>/` ichida yaratiladi.

## 5. Restore

Restore qilishdan oldin API processni to'xtating. Keyin:

```txt
npm run api:restore -- data/backups/uytop-2026-04-28T10-00-00-000Z --force
```

Script mavjud datani `data/restore-safety-<timestamp>/` ichiga saqlab qo'yadi, so'ng backupdan tiklaydi. Restore tugagach API processni qayta ishga tushiring.

## 6. Health check

Backend:

```txt
curl https://api.uytop.uz/health
```

Kutiladigan javobda `ok: true`, Mongo rejimida `driver: "mongo"` va production origin sozlamalari ko'rinadi.

Production envni alohida tekshirish:

```txt
npm run api:production-check
```

`UYTOP_ENV=production` bo'lsa, CORS, admin parol, secure cookie, SMS va payment secret kabi muhim kamchiliklar scriptni xato bilan to'xtatadi.

## 7. Final tekshiruv checklist

Internetga chiqarishdan oldin quyidagilarni alohida tekshiring:

- `UYTOP_ALLOWED_ORIGINS` ichida faqat haqiqiy frontend domenlari bo'lsin, `*` qolmasin.
- `UYTOP_ADMIN_PASSWORD` demo parol emas, kuchli production parol bo'lsin.
- HTTPS ishlaganda `UYTOP_COOKIE_SECURE=true`, lokal HTTP testda esa `false` bo'lsin.
- Login, OTP, upload va message endpointlari rate-limit bilan ishlayotganini tekshiring.
- Production OTP uchun SMS provider webhooki ishlayotganini, lokal testda esa faqat `dev` rejim qolganini tekshiring.
- Top/Premium e'lonlar uchun payment provider/webhook secret sozlamalari hujjatlashtirilganini tekshiring.
- MongoDB rejimida indexlar yaratilganini tekshiring:

```txt
npm run api:check-indexes
```

- Backup scriptni kamida bir marta real ishga tushirib ko'ring:

```txt
npm run api:backup
```

- Admin paneldan upload cleanup, report workflow, image quality va action log sahifalarini tekshiring.
- `data/logs/api-errors.log` faylida production test paytida yangi 500 xatolar yo'qligini ko'ring.
- Frontend builddan keyin `REACT_APP_UYTOP_API_URL` production API domeniga qarayotganini tekshiring.
