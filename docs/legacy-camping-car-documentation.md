# Camping Car Platform Documentation

Last updated: 2026-03-14

## 1. Purpose

This workspace contains one platform split into 3 main applications:

- `camp-car-new/` -> public website shown to end users
- `New folder (2)/admin1/` -> admin dashboard used to manage content
- `New folder (2)/admin-server/` -> Express + MongoDB backend

This file is meant to save time in future sessions by documenting:

- which folders matter
- which routes are actually active
- which features are live vs legacy
- how data flows between admin, backend, and public UI

## 2. Workspace Map

### Active app folders

- `camp-car-new/`
- `New folder (2)/admin1/`
- `New folder (2)/admin-server/`

### Lower-priority or generated folders

- `build/` directories -> generated output
- `node_modules/` -> dependencies only
- `uploads/` -> runtime image storage from backend

### Standalone root files

- `PROJECT_DOCUMENTATION.md` -> this summary
- `HMenu.jsx`, `newVMneu.jsx`, `replace_block.py`, `test-image.jpg` -> not part of the main active runtime flow

## 3. High-Level Architecture

### Current runtime

1. `admin-server` runs on `http://localhost:5052`
2. `admin1` logs in against backend auth endpoints and stores JWT in `localStorage.token`
3. `admin1` creates and edits motor/caravan content and uploads images
4. `camp-car-new` reads motor/caravan data from backend and shows it on public pages

### Database

- MongoDB database name: `camping-car`
- Default connection in `server.js`: `mongodb://localhost:27017/camping-car`

### Auth

- JWT secret is read from `.env`
- Fallback secret in code is also `"SSHHHH"`
- Protected endpoints require `Authorization: Bearer <token>`

## 4. Backend: `New folder (2)/admin-server`

## 4.1 Main entry point

The real backend entry point is:

- `New folder (2)/admin-server/server.js`

This file mounts:

- `motorRoutes`
- `caravanRoutes`
- `caravanComfortRoutes`
- `frontendRoutes`
- `authRoutes`

It also serves:

- `express.json()`
- `cors()`
- static files from `/uploads`

### Important note

`caravanserver.js`, `usedcarserver.js`, and `tuningserver.js` are commented-out legacy files and are not part of the active runtime.

## 4.2 Active mounted routes

### Auth

- `POST /auth/sign-up`
- `POST /auth/sign-in`

Source files:

- `routes/auth.router.js`
- `controller/user.control.js`

### Motor CRUD

- `POST /upload` -> upload motor image, protected
- `POST /api/data` -> create motor, protected
- `GET /api/data` -> list motors
- `GET /api/data/:id` -> get one motor
- `PUT /api/data/:id` -> update motor, protected
- `DELETE /api/data/:id` -> delete motor, protected
- `DELETE /deleteAll` -> delete all motors

Source files:

- `routes/motorRoutes.js`
- `controller/motorcontrol.js`
- `models/motor-models.js`

### Motor detail sections / comfort

- `GET /api/comfort`
- `POST /api/comfort` -> protected
- `PUT /api/comfort/:id` -> protected
- `DELETE /api/comfort/:id` -> protected
- `GET /api/comfort/motor/:motorId`

Source files:

- `routes/motorRoutes.js`
- `controller/comfortcontrol.js`
- `models/comfort-models.js`

### Caravan CRUD

- `POST /api/caravan/upload` -> protected
- `POST /api/caravan` -> protected
- `GET /api/caravan`
- `GET /api/caravan/:id`
- `PUT /api/caravan/:id` -> protected
- `DELETE /api/caravan/:id` -> protected
- `DELETE /api/caravan` -> protected

Source files:

- `routes/caravanrout.js`
- `controller/caravancont.js`
- `models/caravan-model.js`

### Caravan detail sections

- `GET /api/caravan-comfort`
- `POST /api/caravan-comfort` -> protected
- `PUT /api/caravan-comfort/:id` -> protected
- `DELETE /api/caravan-comfort/:id` -> protected
- `GET /api/caravan-comfort/caravan/:caravanId`

Source files:

- `routes/caravanComfortRoutes.js`
- `controller/caravanComfortController.js`
- `models/caravan-comfort-model.js`

### Frontend read-only endpoints

- `GET /api/frontend/motors`
- `GET /api/frontend/motors/:id`
- `GET /api/frontend/caravans`
- `GET /api/frontend/caravans/:id`

Source file:

- `routes/frontendRoutes.js`

### What these frontend routes return

- `/api/frontend/motors/:id` -> one motor plus `comforts[]`
- `/api/frontend/caravans/:id` -> one caravan plus `comforts[]`

## 4.3 Active models

### Motor

File: `models/motor-models.js`

Main fields:

- `name`
- `brand`
- `cost`
- `company`
- `license`
- `location`
- `people`
- `rate`
- `date`
- `image`
- `desc`
- `tabs[]`

### Comfort

File: `models/comfort-models.js`

Main fields:

- `motorId` -> ObjectId ref to `Motor`
- `title`
- `subtitle`
- `description`
- `image`
- `order`
- `imagePosition`

Also keeps old compatibility fields:

- `comfort1`
- `comfort2`
- `comfort3`
- `cmfphoto`

### Caravan

File: `models/caravan-model.js`

Main fields mirror motor fields, plus richer `desc` fields such as:

- `cmfphoto2`
- `cmfphoto3`
- `cmfphoto4`
- `doors`
- `heating`
- `heatphoto`

### CaravanComfort

File: `models/caravan-comfort-model.js`

Structure is parallel to `Comfort`, but linked by `caravanId`.

### User

File: `models/auth.models.js`

Main behavior:

- password hashed in `pre("save")`
- `matchPassword()` compares bcrypt hash

## 4.4 File upload behavior

Uploads are stored in:

- `New folder (2)/admin-server/uploads/`

Important details:

- motor image upload endpoint: `/upload`
- caravan image upload endpoint: `/api/caravan/upload`
- uploaded response returns relative path like `/uploads/file.jpg`
- admin frontends usually convert that to full URL `http://localhost:5052/uploads/...`

## 4.5 Legacy or not-mounted backend modules

These files exist but are not mounted by `server.js`:

- `routes/tuningrout.js`
- `routes/usedcarrout.js`
- `routes/campingplacerout.js`
- `routes/comfortRoutes.js`

### Why they matter

Some admin pages still call these APIs, but because they are not mounted in the active server, those pages are not fully live.

### Extra warning

Some legacy route files are also unsafe to mount as-is:

- `usedcarrout.js` uses `/api/data`, which conflicts with motor routes
- `usedcarcont.js` contains bugs such as undefined variables
- `campingplacerout.js` and `tuningrout.js` use older name-based routes
- legacy models and controllers do not fully match current admin forms

## 5. Admin Frontend: `New folder (2)/admin1`

## 5.1 Entry and routing

Main files:

- `src/index.js`
- `src/routes.jsx`

Routes currently defined:

- `/` -> login page
- `/register` -> sign-up
- `/motor`
- `/comfort`
- `/caravan`
- `/caravan-details`
- `/tuning`
- `/used-car`
- `/camping-place`

Sidebar is hidden on auth pages and shown on content pages.

## 5.2 Auth flow

Files:

- `src/login/index.jsx`
- `src/login/sign-up.jsx`
- `src/sidebar/index.jsx`

Behavior:

- login posts to `POST /auth/sign-in`
- sign-up posts to `POST /auth/sign-up`
- successful login stores `token` in `localStorage`
- logout removes `token` and redirects to `/`

## 5.3 Admin pages that are currently aligned with active backend

### Motor page

File:

- `src/components/motor/motor.jsx`

Behavior:

- fetches `GET /api/data`
- uploads image to `POST /upload`
- creates motor with `POST /api/data`
- updates motor with `PUT /api/data/:id`
- deletes motor with `DELETE /api/data/:id`

Reusable add modal:

- `src/components/motor/addModal.jsx`

### Motor detail sections page

File:

- `src/components/comfort/ComfortTable.jsx`

Behavior:

- fetches motors from `GET /api/data`
- fetches sections from `GET /api/comfort`
- uploads image to `POST /upload`
- creates/edits/deletes comfort sections

### Caravan page

File:

- `src/components/caravan/index.jsx`

Behavior:

- fetches `GET /api/caravan`
- uploads image to `POST /api/caravan/upload`
- creates caravan with `POST /api/caravan`
- updates caravan with `PUT /api/caravan/:id`
- deletes caravan with `DELETE /api/caravan/:id`

### Caravan detail sections page

File:

- `src/components/caravan/CaravanComfortTable.jsx`

Behavior:

- fetches caravans from `GET /api/caravan`
- fetches sections from `GET /api/caravan-comfort`
- uploads image to `POST /api/caravan/upload`
- creates/edits/deletes caravan detail sections

## 5.4 Admin pages that are legacy or partially broken

### Tuning admin

Main file:

- `src/components/tuning/index.jsx`

Current status:

- calls `/api/tuning`
- active backend does not mount tuning routes
- delete flow does not match legacy backend route definitions

### Camping place admin

Main files:

- `src/components/campingPlace/index.jsx`
- `src/components/campingPlace/table.jsx`

Current status:

- expects `/api/camp-place`
- active backend does not mount camping place routes
- one file even posts to `/api/caravan` by mistake

### Used car admin

Main files:

- `src/components/usedcar/index.jsx`
- `src/components/usedcar/table.jsx`

Current status:

- mostly placeholder UI
- not wired to a reliable active backend flow

## 5.5 Admin config helpers

File:

- `src/components/config/config.js`

Contains hardcoded local URLs such as:

- `http://localhost:5052/api/data`
- `http://localhost:5052/api/caravan`
- `http://localhost:5052/api/tuning`
- `http://localhost:5052/api/used-car`
- `http://localhost:5052/api/camp-place`

These are not environment-driven yet.

## 6. Public Frontend: `camp-car-new`

## 6.1 Entry and routing

Main file:

- `src/index.js`

Public routes:

- `/`
- `/motor`
- `/caravan`
- `/tuning`
- `/used-car`
- `/camping-place`
- `/cart`
- `/compare`
- `/motor/:id`
- `/caravan/:id`
- `/used-car/:id`
- `/tuning/:id`
- `/camping-place/:id`
- `/createaccount`

Layout pattern:

- `Navbar` is rendered globally
- `Footer` is rendered globally

## 6.2 Public pages using real backend data

### Motor listing

File:

- `src/components/motor/index.jsx`

Behavior:

- fetches from `GET /api/data`
- merges backend data with fallback static data from `src/data/motordata.js`
- provides filtering by brand, company, license, people, location, and price

Important note:

- motor list uses `/api/data`, not `/api/frontend/motors`
- it works because motor `GET /api/data` is public, but it is inconsistent with detail pages

### Motor detail

File:

- `src/detailItems/motodetail.jsx`

Behavior:

- fetches from `GET /api/frontend/motors/:id`
- if backend fails, falls back to static `Campcar.maindata`
- builds detail sections from either `comforts[]` or legacy `desc`
- passes `motor` into tab component

### Caravan listing

File:

- `src/components/caravan/index.jsx`

Behavior:

- fetches from `GET /api/frontend/caravans`
- merges backend data with fallback static caravan data
- supports same filter pattern as motor

### Caravan detail

File:

- `src/detailItems/caravandetail.jsx`

Behavior:

- fetches from `GET /api/frontend/caravans/:id`
- falls back to static caravan data if needed
- builds sections from `comforts[]` or legacy `desc`

## 6.3 Public pages still using static data only

### Tuning

- `src/components/tuning/index.jsx`
- `src/detailItems/tuningdetail.jsx`
- data source: `src/data/datatuning.js`

### Used car

- `src/components/used-car/index.jsx`
- `src/detailItems/useddetail.jsx`
- data source: `src/data/datausedcar.js`

### Camping place

- `src/components/campPlace/*`
- data source: `src/components/campPlace/data.js`

### Homepage

- `src/homepage/carousel.jsx`
- mostly static carousel + recommendation UI

### Public registration UI

- `src/Signin/register.jsx`

Current status:

- visual form only
- not wired to backend auth

## 6.4 Public utility files worth remembering

### API base helper

File:

- `src/utils/getApiBase.js`

Purpose:

- builds backend base URL from `REACT_APP_API_BASE_URL`
- otherwise uses current hostname + port `5052`

This is newer and better than hardcoded URLs, but not all public files use it yet.

### Image helper

File:

- `src/utils/imageHelpers.js`

Purpose:

- extracts image URL from mixed backend/static object shapes

## 6.5 Public detail tabs

File:

- `src/detailItems/tabbbb/newtabs.jsx`

Important note:

- tab content uses `Premium1` and `Premium2`
- those components still read review-like content from static `Campcar` data
- so even on backend-backed detail pages, the tab content is partly mock/fallback oriented

## 7. Cross-App Data Flow

## 7.1 Motor flow

1. Admin logs in and gets token
2. Admin uploads image to `/upload`
3. Admin creates motor through `POST /api/data`
4. Admin creates motor detail sections through `POST /api/comfort`
5. Public motor list reads from `/api/data`
6. Public motor detail reads from `/api/frontend/motors/:id`

## 7.2 Caravan flow

1. Admin logs in and gets token
2. Admin uploads image to `/api/caravan/upload`
3. Admin creates caravan through `POST /api/caravan`
4. Admin creates caravan detail sections through `POST /api/caravan-comfort`
5. Public caravan list reads from `/api/frontend/caravans`
6. Public caravan detail reads from `/api/frontend/caravans/:id`

## 7.3 Images

- backend stores upload file under `uploads/`
- admin stores or resolves full URL with backend host
- public UI resolves relative backend paths into actual image URLs

## 8. Important Current Gaps

These are the main realities to remember before making future changes:

- Only motor + comfort + caravan + caravan-comfort + auth are fully active in the main backend runtime.
- Tuning, used-car, and camping-place are not fully live end-to-end right now.
- Public motor list uses `/api/data`, while motor detail uses `/api/frontend/motors/:id`.
- A lot of files still hardcode `http://localhost:5052`.
- Public tuning/used-car/camping-place pages are mostly static and not synced with admin data.
- Some admin legacy pages are placeholders or partly incorrect.
- The default JWT secret appears in code and `.env`; this is not safe for production.

## 9. Best Folders to Inspect First in Future Sessions

If a new session starts and context is missing, read these first:

### Runtime-critical

- `New folder (2)/admin-server/server.js`
- `New folder (2)/admin-server/routes/motorRoutes.js`
- `New folder (2)/admin-server/routes/caravanrout.js`
- `New folder (2)/admin-server/routes/caravanComfortRoutes.js`
- `New folder (2)/admin-server/routes/frontendRoutes.js`
- `New folder (2)/admin-server/controller/motorcontrol.js`
- `New folder (2)/admin-server/controller/comfortcontrol.js`
- `New folder (2)/admin-server/controller/caravancont.js`
- `New folder (2)/admin-server/controller/caravanComfortController.js`

### Admin-critical

- `New folder (2)/admin1/src/routes.jsx`
- `New folder (2)/admin1/src/components/motor/motor.jsx`
- `New folder (2)/admin1/src/components/motor/addModal.jsx`
- `New folder (2)/admin1/src/components/comfort/ComfortTable.jsx`
- `New folder (2)/admin1/src/components/caravan/index.jsx`
- `New folder (2)/admin1/src/components/caravan/CaravanComfortTable.jsx`

### Public-critical

- `camp-car-new/src/index.js`
- `camp-car-new/src/components/motor/index.jsx`
- `camp-car-new/src/components/caravan/index.jsx`
- `camp-car-new/src/detailItems/motodetail.jsx`
- `camp-car-new/src/detailItems/caravandetail.jsx`
- `camp-car-new/src/utils/getApiBase.js`
- `camp-car-new/src/utils/imageHelpers.js`

## 10. Recommended Startup Order

1. Start MongoDB locally
2. Start backend:
   - `cd "New folder (2)/admin-server"`
   - `npm start`
3. Start admin:
   - `cd "New folder (2)/admin1"`
   - `npm start`
4. Start public site:
   - `cd "camp-car-new"`
   - `npm start`

If both frontend apps try to use the same CRA port, one of them will prompt for a different port.

## 11. Short Summary

At the moment this platform is strongest around:

- motor CRUD
- motor detail sections
- caravan CRUD
- caravan detail sections
- auth + uploads
- public motor/caravan display

The weakest or most legacy areas are:

- tuning
- used-car
- camping-place
- some tab/review content still backed by mock data

