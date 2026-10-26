# UyTop Backend Schema

Bu hujjat frontendni backendga ulashda kerak bo'ladigan asosiy model va endpointlarni belgilaydi.

## User

```ts
type User = {
  id: string;
  name: string;
  phone: string;
  email?: string;
  role: "user" | "admin";
  accountStatus: "active" | "blocked";
  blockReason?: string;
  registeredAt: string;
  lastLoginAt: string;
};
```

## Listing

```ts
type Listing = {
  id: number;
  ownerId: string;
  title: string;
  dealType: "sale" | "rent";
  propertyType: "Kvartira" | "Hovli" | "Yangi qurilish" | "Ofis";
  city: string;
  district: string;
  address: string;
  price: number;
  rooms: number;
  area: number;
  floor: string;
  description: string;
  image: string;
  galleryImages: string[];
  tags: string[];
  listingPlan: "standard" | "top" | "premium";
  planExpiresAt?: string;
  paymentStatus: "not_required" | "pending" | "paid" | "failed";
  paymentProvider?: "click" | "payme" | "manual";
  paymentAmount?: number;
  paymentReference?: string;
  negotiable: boolean;
  phone: string;
  agent: string;
  moderationStatus: "pending" | "approved" | "rejected";
  adminNote?: string;
  verified: boolean;
  createdAt: string;
  updatedAt: string;
};
```

## Conversation

```ts
type Conversation = {
  key: string;
  listingId: number;
  participantIds: string[];
  lastMessageId: number;
  unreadCountByUser: Record<string, number>;
  createdAt: string;
  updatedAt: string;
};
```

## Message

```ts
type Message = {
  id: number;
  conversationKey: string;
  listingId: number;
  senderId: string;
  recipientId: string;
  body: string;
  attachmentImage?: string;
  readBy: string[];
  createdAt: string;
};
```

## Favorite

```ts
type Favorite = {
  id: string;
  userId: string;
  listingId: number;
  createdAt: string;
};
```

## Marketplace Workflow Tables

SQLite backendda MVPdan keyingi workflow uchun quyidagi jadvallar ham bor:

- `listing_reports` - shikoyat sababi, statusi va yopilgan vaqti.
- `listing_stats` - ko'rish, favorite va lead hisoblagichlari.
- `saved_searches` - user saqlagan filterlar.
- `notifications` - user bildirishnomalari.
- `admin_action_logs` - admin bajargan muhim amallar tarixi.

## Endpointlar

```txt
POST   /auth/login
POST   /auth/register
POST   /auth/logout
GET    /me
PATCH  /me
GET    /saved-searches
POST   /saved-searches
DELETE /saved-searches/:id
GET    /notifications
PATCH  /notifications/:id/read
PATCH  /notifications/read-all

GET    /listing-stats
GET    /listings/:id/stats
POST   /listings/:id/stats/view
POST   /listings/:id/stats/lead
GET    /listings
GET    /listings/:id
POST   /listings/:id/reports
POST   /listings
PATCH  /listings/:id
DELETE /listings/:id
POST   /uploads/listing-images
POST   /uploads/message-attachments

GET    /favorites
POST   /favorites/:listingId
DELETE /favorites/:listingId

GET    /conversations
GET    /conversations/:key/messages
POST   /conversations/:key/messages
PATCH  /conversations/:key/read
PATCH  /conversations/:key/archive

GET    /admin/users
PATCH  /admin/users/:id/status
GET    /admin/listings
PATCH  /admin/listings/:id/moderation
PATCH  /admin/listings/:id/note
GET    /admin/messages
GET    /admin/reports
PATCH  /admin/reports/:id/resolve
GET    /admin/actions
POST   /admin/actions
POST   /admin/uploads/cleanup
```

## Frontend integratsiya

- Frontenddagi API adapter: `src/services/realEstateApi.js`.
- API/localStorage rejimini tanlaydigan gateway: `src/services/realEstateDataGateway.js`.
- Backend URL `.env` orqali beriladi: `REACT_APP_UYTOP_API_URL=https://api.example.uz`.
- Backend URL sozlanmaganda app hozirgi demo `localStorage` rejimida qoladi.
- Backend URL sozlanganda app boshlanishida `/listings`, cookie session bo'lsa `/me`, `/favorites`, `/conversations` endpointlaridan state yig'ishga urinadi.
- Listing yaratish/tahrirlash/o'chirish, favorite qo'shish/olib tashlash, chat xabari, profil yangilash va admin moderation/user status amallari gateway orqali APIga yuborishga tayyor.
- Admin user bloklaganda `blockReason` backendga yuboriladi va user qayta aktiv qilinganda tozalanadi.
- Listing shikoyatlari `/listings/:id/reports` orqali backendga yoziladi; admin ularni `/admin/reports` va `/admin/reports/:id/resolve` orqali ko'radi/yopadi.
- Admin harakatlari `/admin/actions` orqali backendda saqlanadi.
- Saved searchlar `/saved-searches` endpointlari orqali user kesimida backendda saqlanadi.
- Bildirishnomalar `/notifications` endpointlari orqali backenddan keladi; chat, e'lon joylash, admin moderation va account status voqealari notification yozadi.
- Listing statistikasi `/listing-stats` va `/listings/:id/stats/*` endpointlari orqali backendda saqlanadi. Detail sahifa ko'rishlarni, telefon/WhatsApp/chat bosishlar esa lead hisoblagichini oshiradi.
- Ishlatilmayotgan eski upload fayllarni admin `/admin/uploads/cleanup` orqali tozalaydi.
- Rasm fayllari avval `/uploads/listing-images` yoki `/uploads/message-attachments` endpointiga `multipart/form-data` bilan yuboriladi; listing/message payloadida faqat qaytgan URL saqlanadi. Demo `localStorage` rejimida eski data URL fallback ishlaydi.
- API validation frontendga ishonib qolmaydi: user, profile, listing, message, favorite va upload payloadlari backendda ham tekshiriladi. Noto'g'ri payloadlar `400` va `details.fields` bilan qaytadi.
- Upload faqat haqiqiy `image/jpeg`, `image/png`, `image/webp`, `image/gif` fayllarni qabul qiladi. Listing uchun bir martada 8 tagacha, message attachment uchun 1 ta rasm yuklanadi. Frontend katta rasmlarni canvas orqali kichraytiradi, backend esa `UYTOP_MAX_UPLOAD_FILE_MB` limitini majburiy tekshiradi.
- Listing rasmlari xira chiqmasligi uchun upload kamida `900x480` px bo'lishi kerak. Bu limitlar `UYTOP_MIN_LISTING_IMAGE_LONG_SIDE` va `UYTOP_MIN_LISTING_IMAGE_SHORT_SIDE` env orqali o'zgartiriladi.
- Demo admin kirishi frontend rol tanlashsiz ishlaydi:
  - telefon: `+998 99 000 00 01`
  - parol: `admin1234`
- Demo admin qiymatlarini `.env` orqali almashtirish mumkin:
  - `REACT_APP_DEMO_ADMIN_PHONE`
  - `REACT_APP_DEMO_ADMIN_PASSWORD`
  - `REACT_APP_DEMO_ADMIN_NAME`
  - `REACT_APP_DEMO_ADMIN_EMAIL`

## MongoDB API

Lokal MongoDB ishlayotgan bo'lsa backendni Mongo rejimida yurgizish:

```txt
npm run api
```

`.env.api.local`:

```txt
UYTOP_DB_DRIVER=mongo
MONGODB_URI=mongodb://localhost:27017/
MONGODB_DB=uytop
```

Mongo collectionlar:

```txt
users
listings
sessions
favorites
messages
listing_reports
listing_stats
saved_searches
notifications
admin_action_logs
counters
```

Default manzil: `http://127.0.0.1:4100`. Frontend uchun `.env.local`:

```txt
REACT_APP_UYTOP_API_URL=http://127.0.0.1:4100
```

## SQLite API

SQLite fallback hali saqlangan:

```txt
npm run api:sqlite
```

Default manzil: `http://127.0.0.1:4100`. Frontendni shu backendga ulash uchun `.env.local` ichiga quyidagini yozing va React dev serverni qayta ishga tushiring:

```txt
REACT_APP_UYTOP_API_URL=http://127.0.0.1:4100
```

Database va upload fayllari `data/` ostida yaratiladi. Database reset qilish:

```txt
npm run api:reset
```

Seed loginlar:

- Admin: `+998 99 000 00 01` / `admin1234`
- Demo user: `+998 90 123 45 67` / `demo1234`
- Demo buyer: `+998 97 555 12 34` / `demo1234`

API sessionlari `sessions` jadvalida token hash ko'rinishida saqlanadi. Browser tokenni JavaScript localStorage orqali emas, `HttpOnly` cookie orqali olib yuradi. Default muddati 30 kun; `UYTOP_SESSION_TTL_DAYS` env orqali o'zgartiriladi. Eski SHA-256 password hashlar login paytida avtomatik `scrypt` hashga yangilanadi. Schema o'zgarishlari `schema_migrations` jadvalida qayd qilinadi.

Deployment, production env, backup va restore ketma-ketligi: `docs/deployment.md`.

## Mock API

Backend hali tayyor bo'lmaganda API rejimini lokal tekshirish uchun in-memory mock server bor:

```txt
npm run mock-api
```

Default manzil: `http://127.0.0.1:4000`. Frontendni API rejimida ishga tushirish uchun `.env.local` yoki terminal envga shuni bering:

```txt
REACT_APP_UYTOP_API_URL=http://127.0.0.1:4000
```

Mock server ma'lumotni xotirada saqlaydi; server qayta ishga tushsa seed state qaytadan yaratiladi. Upload endpointlari real fayl saqlamaydi, ular frontend flowini tekshirish uchun rasm URLlari qaytaradi.

## Muhim qoidalar

- `admin` rol frontenddan tanlanmaydi; backendda admin alohida beriladi.
- `blocked` user e'lon qo'sha olmaydi, e'lon tahrirlay olmaydi va yangi xabar yubora olmaydi.
- Yangi e'lonlar darhol `approved` statusida chiqadi; admin panel keyingi nazorat va rad etish uchun ishlaydi.
- Xabarlar profil sahifasida list bo'lib chiqmaydi; faqat chat sahifasida ko'rinadi.
- Har bir conversation `listingId + ikki participant` bo'yicha yagona bo'lishi kerak.
