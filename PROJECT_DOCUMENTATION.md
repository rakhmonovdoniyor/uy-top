# UyTop Project Documentation

Last updated: 2026-05-02

This document is the main handoff file for UyTop. It is written so another developer or AI agent can understand what the project does, how it runs, where the important code lives, and what tradeoffs still exist.

Old Camping Car documentation was preserved at `docs/legacy-camping-car-documentation.md`. This root file now describes only the current UyTop project.

## 1. Project Summary

UyTop is a real estate marketplace MVP for Uzbekistan. It supports:

- browsing sale and rent listings
- filtering listings
- viewing listing detail pages with gallery, map, agent/contact area, related listings
- adding and editing listings
- login/register with phone and password
- favorites
- chat conversations per listing and user pair
- profile page with user listings, favorites, notifications, and saved state
- admin panel for users, listings, messages, reports, and admin action logs
- MongoDB backend as the active backend
- SQLite backend as a fallback/legacy backend
- localStorage demo mode when no API URL is configured

The main frontend route flow is:

```txt
e'lon ko'rish -> filterlash -> detail -> aloqa/chat -> profil/admin
```

## 2. Current Runtime State

The project currently uses:

- frontend: React 18 with Create React App
- routing: `react-router-dom`
- icons: `react-icons/fi`
- active backend: Node.js HTTP server with MongoDB driver
- database: local MongoDB database named `uytop`
- fallback backend: Node.js HTTP server with SQLite
- preview server: custom static server for `build/`

Current local LAN setup used during development:

```txt
Frontend preview: http://192.168.100.240:3000
Backend API:       http://192.168.100.240:4100
MongoDB:           mongodb://localhost:27017/
Mongo database:    uytop
```

The IP `192.168.100.240` is this laptop's Wi-Fi IP. It can change when Wi-Fi changes. If it changes, update `.env.local`.

## 3. Quick Start

Install dependencies:

```powershell
npm install
```

Start Mongo backend:

```powershell
npm run api
```

Start React dev frontend:

```powershell
npm start
```

Build production frontend:

```powershell
npm run build
```

Serve production build locally:

```powershell
npm run preview
```

Run tests:

```powershell
$env:CI='true'; npm test -- --watchAll=false --runInBand
```

## 4. Important URLs

Backend health:

```txt
http://127.0.0.1:4100/health
http://192.168.100.240:4100/health
```

Frontend on this laptop:

```txt
http://localhost:3000
```

Frontend on phone connected to the same Wi-Fi:

```txt
http://192.168.100.240:3000
```

Example listing detail:

```txt
http://192.168.100.240:3000/listings/2
```

## 5. Environment Files

### `.env.local`

Used by React frontend.

Current local phone/LAN setup:

```txt
REACT_APP_UYTOP_API_URL=http://192.168.100.240:4100
```

For same-machine only:

```txt
REACT_APP_UYTOP_API_URL=http://127.0.0.1:4100
```

React reads `.env.local` only when the dev server starts. Restart frontend after changing this file.

### `.env.api.local`

Used by backend.

Current Mongo setup:

```txt
HOST=0.0.0.0
API_PORT=4100
UYTOP_ALLOWED_ORIGINS=*
UYTOP_DB_DRIVER=mongo
MONGODB_URI=mongodb://localhost:27017/
MONGODB_DB=uytop
UYTOP_AUTH_COOKIE_NAME=uytop_session
UYTOP_COOKIE_SECURE=false
UYTOP_MAX_UPLOAD_FILE_MB=3
UYTOP_MIN_LISTING_IMAGE_LONG_SIDE=900
UYTOP_MIN_LISTING_IMAGE_SHORT_SIDE=480
UYTOP_UPLOAD_CLEANUP_DAYS=7
```

`HOST=0.0.0.0` lets the phone access the backend over Wi-Fi.

### Example env files

- `.env.example` - local frontend API example
- `.env.production.example` - production frontend API example
- `.env.api.example` - backend env example

## 6. Scripts

Defined in `package.json`:

```txt
npm start        React development server
npm run build    Production build into build/
npm run preview  Static preview server for build/
npm test         React tests
npm run api      Backend entrypoint; chooses Mongo or SQLite by env
npm run api:mongo Direct Mongo backend
npm run api:sqlite Legacy SQLite backend
npm run mock-api  In-memory mock API
npm run api:backup SQLite backup helper
npm run api:restore SQLite restore helper
```

`npm run api` runs `scripts/api-server-entry.js`.

That entrypoint reads `.env.api.local` and chooses:

- `scripts/api-server-mongo.js` if `UYTOP_DB_DRIVER=mongo`
- `scripts/api-server.js` otherwise

## 7. Folder Map

```txt
src/
  index.js
  App.js
  data/
    realEstateData.js
  services/
    realEstateApi.js
    realEstateDataGateway.js
    realEstateRepository.js
    realEstateStorage.js
    realEstateAuth.js
  components/realEstate/
    RealEstateApp.jsx
    constants.js
    realEstate.css
    components/
    pages/
    utils/

scripts/
  api-server-entry.js
  api-server-mongo.js
  api-server.js
  mock-api.js
  preview-server.js
  backup-db.js
  restore-db.js

docs/
  backend-schema.md
  deployment.md
  legacy-camping-car-documentation.md

data/
  uytop.sqlite
  uploads/
  logs/

build/
  generated production frontend
```

## 8. Frontend Architecture

The frontend is mounted from:

- `src/index.js`
- `src/App.js`
- `src/components/realEstate/index.js`
- `src/components/realEstate/RealEstateApp.jsx`

`RealEstateApp.jsx` is the main state container. It owns:

- listings
- filters
- current user
- favorites
- messages
- users
- listing reports
- admin actions
- derived conversations
- derived listing stats
- API/localStorage state loading

Most page components receive `appState` props from `RealEstateApp.jsx`.

### Frontend Routes

Defined in `src/components/realEstate/RealEstateApp.jsx`:

```txt
/                    HomePage
/listings            ListingsPage
/listings/:listingId ListingDetailPage
/add-listing         AddListingPage, protected active user route
/edit-listing/:id    EditListingPage, protected active user route
/login               AuthPage
/chats               ChatPage, protected auth route
/profile             ProfilePage, protected auth route
/admin               AdminPage, admin only
*                    NotFoundPage
```

### Route guards

File:

- `src/components/realEstate/components/RouteGuards.jsx`

Guards:

- `RequireAuth` - user must be logged in
- `RequireActiveUser` - user must be logged in and not blocked
- `RequireAdmin` - user must be admin

Return URLs preserve query strings, for example `/chats?listing=2`.

## 9. Key Frontend Pages

### `HomePage.jsx`

Landing/home experience with hero, search, market strip, featured listings, and workflow cards.

### `ListingsPage.jsx`

Listing search page. Supports:

- intent tabs: all, sale, rent
- compact search panel
- advanced filters
- grid/list view
- saved searches in localStorage
- favorites

### `ListingDetailPage.jsx`

Detail page for one listing. Supports:

- gallery and gallery modal
- price/status/agent contact card
- call, WhatsApp, Telegram share
- chat link into `/chats?listing=<id>`
- map
- report form
- related listings
- mobile-specific layout

Important recent change: message popup was removed. The `Xabar yozish` button now opens the chat page for that listing.

### `ChatPage.jsx`

Chat interface. Supports:

- conversation list
- active conversation thread
- `?chat=<conversationKey>` direct open
- `?listing=<listingId>` new or existing listing conversation open
- text message
- image attachment flow through API upload
- hide conversation locally
- mark read

If a listing chat does not exist yet, ChatPage creates a temporary pending conversation in UI. The first sent message persists it.

### `AddListingPage.jsx`

Wizard-style listing form. Supports:

- step tabs: basics, location, media, contact
- draft save to localStorage
- before-unload warning for unsaved edits
- images
- listing plan: standard, top, premium
- negotiable price flag

### `ProfilePage.jsx`

User dashboard. Shows:

- profile info
- own listings
- favorites
- notifications
- recent chats
- reset demo state button

### `AdminPage.jsx`

Admin dashboard. Supports:

- users
- listing moderation
- messages
- reports
- admin action logs
- user block reason
- top/premium visibility fields

## 10. Reusable Frontend Components

Important files:

```txt
SiteHeader.jsx
MobileNav.jsx
SearchPanel.jsx
ListingCard.jsx
ListingMap.jsx
DetailAside.jsx
MessageModal.jsx
EmptyState.jsx
PageIntro.jsx
MarketStrip.jsx
MiniStat.jsx
WorkflowCard.jsx
SiteFooter.jsx
```

Note: `MessageModal.jsx` still exists, but current listing detail flow no longer uses it. It may be removed later if no other flow needs it.

## 11. Styling

Main CSS file:

```txt
src/components/realEstate/realEstate.css
```

The app uses one shared CSS file with CSS variables:

```txt
--estate-bg
--estate-surface
--estate-green
--estate-green-dark
--estate-muted
--estate-line
```

Important mobile UX decisions:

- desktop account actions are hidden inside mobile header
- mobile bottom navigation is fixed
- detail contact buttons are inside the contact card, not over the image
- Android system navigation bar cannot be styled by app CSS

## 12. Data Flow

Frontend data access goes through:

```txt
realEstateApi.js          raw HTTP client
realEstateDataGateway.js  switches API vs localStorage mode
realEstateRepository.js   local state utilities and pure data operations
realEstateStorage.js      localStorage keys/read/write
```

Flow:

```txt
Component -> RealEstateApp action -> realEstateDataGateway -> realEstateApi -> backend
```

If `REACT_APP_UYTOP_API_URL` is empty, gateway uses localStorage demo mode.

If `REACT_APP_UYTOP_API_URL` is set, gateway uses API mode.

## 13. Authentication

User login/register:

```txt
POST /auth/login
POST /auth/register
POST /auth/logout
GET  /me
PATCH /me
```

Backend stores hashed sessions in Mongo `sessions` collection when Mongo mode is active.

Login/register sets an `HttpOnly` auth cookie. Frontend fetch requests use `credentials: "include"` and do not store the API token in localStorage. Bearer token fallback is still accepted by the backend for older local sessions/tools.

Seed users:

```txt
Admin:      +998 99 000 00 01 / admin1234
Demo user:  +998 90 123 45 67 / demo1234
Demo buyer: +998 97 555 12 34 / demo1234
```

Admin values can be overridden with:

```txt
UYTOP_ADMIN_PHONE
UYTOP_ADMIN_PASSWORD
```

## 14. Backend Architecture

There are three backend options.

### Active Mongo Backend

File:

```txt
scripts/api-server-mongo.js
```

Uses:

```txt
mongodb
http
crypto
fs
path
```

Main features:

- connects to MongoDB
- seeds users and listings
- imports listings/favorites/messages from SQLite if Mongo listing collection is empty
- stores sessions in Mongo
- sets/clears the `uytop_session` HttpOnly cookie for auth
- persists listing reports and admin action logs
- serves uploads from `data/uploads`
- writes 500-level errors to `data/logs/api-errors.log`
- exposes the same API contract expected by frontend

Mongo collections:

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

### Backend Entrypoint

File:

```txt
scripts/api-server-entry.js
```

It loads `.env.api.local` and chooses Mongo or SQLite.

### Legacy SQLite Backend

File:

```txt
scripts/api-server.js
```

Use it with:

```powershell
npm run api:sqlite
```

SQLite database path:

```txt
data/uytop.sqlite
```

### Mock API

File:

```txt
scripts/mock-api.js
```

Use it with:

```powershell
npm run mock-api
```

Default mock URL:

```txt
http://127.0.0.1:4000
```

## 15. API Endpoints

Backend API contract used by frontend:

```txt
GET    /health

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
GET    /uploads/*

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

## 16. Main Data Models

### User

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

### Listing

```ts
type Listing = {
  id: number;
  ownerId: string;
  title: string;
  dealType: "sale" | "rent";
  typeLabel: "Sotuv" | "Ijara";
  propertyType: string;
  city: string;
  district: string;
  address: string;
  price: number;
  priceLabel: string;
  rooms: number;
  area: number;
  floor: string;
  image: string;
  galleryImages: string[];
  tags: string[];
  phone: string;
  agent: string;
  moderationStatus: "pending" | "approved" | "rejected";
  listingPlan: "standard" | "top" | "premium";
  planExpiresAt?: string;
  negotiable: boolean;
  verified: boolean;
  description: string;
  adminNote?: string;
  createdAt: string;
  updatedAt: string;
};
```

### Message

```ts
type Message = {
  id: number;
  conversationKey: string;
  listingId: number;
  listingTitle: string;
  listingImage: string;
  listingPrice: string;
  senderId: string;
  senderName: string;
  senderPhone: string;
  recipientId: string;
  recipientName: string;
  recipientPhone: string;
  body: string;
  attachmentImage?: string;
  read: boolean;
  createdAt: string;
  createdAtLabel: string;
};
```

### Conversation

Conversation is derived from messages in frontend and backend responses.

```ts
type Conversation = {
  key: string;
  listingId: number;
  listingTitle: string;
  listingImage: string;
  listingPrice: string;
  otherUser: {
    id: string;
    name: string;
    phone: string;
  };
  messages: Message[];
  unreadCount: number;
  lastMessagePreview: string;
  updatedAt: string;
};
```

### ListingStats

```ts
type ListingStats = {
  listingId: number;
  views: number;
  favorites: number;
  leads: number;
  updatedAt: string;
};
```

Detail page views are tracked with `POST /listings/:id/stats/view`. Phone reveal/call, WhatsApp, and chat clicks are tracked with `POST /listings/:id/stats/lead`. Favorite count is synced when favorites are added or removed.

## 17. MongoDB Notes

Current connection:

```txt
mongodb://localhost:27017/
```

Database:

```txt
uytop
```

Compass connection name can be any label, for example `UyTop`.

Backend health should show:

```json
{
  "ok": true,
  "service": "uytop-api-mongo",
  "driver": "mongo",
  "database": "uytop"
}
```

Important:

- phone/browser never connects directly to MongoDB
- phone connects to backend API
- backend connects to MongoDB locally on the laptop

## 18. Uploads

Uploads are saved under:

```txt
data/uploads/listing-images/
data/uploads/message-attachments/
```

Mongo backend returns public URLs like:

```txt
http://<backend-host>/uploads/listing-images/<file>
```

The backend serves:

```txt
GET /uploads/*
```

Frontend validates JPG, PNG, WEBP and GIF files before preview. Large listing and chat images are compressed in the browser before upload. Backend also verifies real image signatures and rejects files over `UYTOP_MAX_UPLOAD_FILE_MB` per file.
Listing images must be at least `900x480` px by default, so tiny thumbnails do not become blurry on detail pages. The backend limits can be changed with `UYTOP_MIN_LISTING_IMAGE_LONG_SIDE` and `UYTOP_MIN_LISTING_IMAGE_SHORT_SIDE`.

Admins can run upload cleanup from the admin log tab. The backend deletes unreferenced files older than `UYTOP_UPLOAD_CLEANUP_DAYS`.

Saved searches and notifications are backend-backed in API mode. In demo mode they still persist in localStorage.

## 19. LocalStorage Keys

Local state is managed in `src/services/realEstateStorage.js`.

Important stored values include:

- current user
- favorite IDs
- created listings
- deleted listing IDs
- listing overrides
- listing stats in local demo mode only
- messages
- users
- listing reports in local demo mode only
- admin actions in local demo mode only
- saved searches
- listing form draft
- hidden chats

When API mode is active, auth session, listing reports and admin action logs come from backend. A few UI-only items still use localStorage.

## 20. Mobile Testing

To test on phone:

1. phone and laptop must be on same Wi-Fi
2. backend must use `HOST=0.0.0.0`
3. frontend `.env.local` must use laptop Wi-Fi IP
4. Windows Firewall may need allow access for Node.js

Check laptop IP:

```powershell
Get-NetIPAddress -AddressFamily IPv4
```

Check ports:

```powershell
Get-NetTCPConnection -LocalPort 3000,4100,27017
```

Phone URL example:

```txt
http://192.168.100.240:3000
```

If stale CSS/JS appears, append a cache buster:

```txt
http://192.168.100.240:3000/listings/2?v=6
```

## 21. Verification Commands

Backend syntax:

```powershell
node --check scripts\api-server-entry.js
node --check scripts\api-server-mongo.js
node --check scripts\api-server.js
node --check scripts\mock-api.js
node --check scripts\preview-server.js
```

Frontend build:

```powershell
npm run build
```

Tests:

```powershell
$env:CI='true'; npm test -- --watchAll=false --runInBand
```

Mongo health:

```powershell
Invoke-RestMethod http://127.0.0.1:4100/health
```

Mongo collection counts:

```powershell
@'
const { MongoClient } = require("mongodb");
(async () => {
  const client = new MongoClient("mongodb://localhost:27017/");
  await client.connect();
  const db = client.db("uytop");
  for (const name of ["users", "listings", "sessions", "favorites", "messages"]) {
    console.log(name, await db.collection(name).countDocuments());
  }
  await client.close();
})();
'@ | node -
```

## 22. Current Known Limitations

These are known and should not surprise future maintainers:

- Mongo backend is implemented as a parallel server, not a deeply abstracted repository layer.
- SQLite backend still exists and is useful as fallback, but active development is Mongo-first.
- Listing stats are backend-backed, but they are simple counters; unique views by user/IP are not implemented yet.
- `MessageModal.jsx` is still in the repo but not used by current listing detail flow.
- `npm audit` currently reports dependency vulnerabilities from the CRA dependency tree. Treat major upgrades carefully.

## 23. Safe Development Rules For Future AI/Developers

When continuing this project:

- do not remove Mongo support
- do not remove SQLite fallback unless explicitly asked
- keep `.env.local` and `.env.api.local` local-only
- keep frontend API contract stable unless frontend and backend are changed together
- after backend changes, run `node --check` and API smoke tests
- after frontend changes, run `npm run build` and tests
- when editing mobile UX, test or reason against phone viewport first
- avoid adding a second design system; use existing `realEstate.css` patterns
- preserve Uzbek UI text
- avoid changing generated `build/` manually

## 24. Useful File Links

- Main app: `src/components/realEstate/RealEstateApp.jsx`
- Main CSS: `src/components/realEstate/realEstate.css`
- Frontend API client: `src/services/realEstateApi.js`
- API/localStorage gateway: `src/services/realEstateDataGateway.js`
- Local repository helpers: `src/services/realEstateRepository.js`
- Local storage helper: `src/services/realEstateStorage.js`
- Mongo backend: `scripts/api-server-mongo.js`
- Backend entrypoint: `scripts/api-server-entry.js`
- SQLite backend: `scripts/api-server.js`
- Preview server: `scripts/preview-server.js`
- Backend schema notes: `docs/backend-schema.md`
- Deployment notes: `docs/deployment.md`

## 25. Minimal Handoff Summary

UyTop is a React real estate marketplace MVP with a Node backend. The active backend is MongoDB via `scripts/api-server-mongo.js`, selected by `.env.api.local` through `scripts/api-server-entry.js`. The frontend uses `REACT_APP_UYTOP_API_URL` to decide API mode. The main app state is in `RealEstateApp.jsx`, the HTTP client is `realEstateApi.js`, and the API/localStorage switch is `realEstateDataGateway.js`. Mobile testing uses the laptop LAN IP. The main run commands are `npm run api`, `npm run build`, and `npm run preview`.
