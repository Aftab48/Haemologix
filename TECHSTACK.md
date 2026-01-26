## Haemologix Tech Stack

### Overview
- TypeScript, Next.js App Router (v15), React 18
- NeonDB PostgreSQL via Prisma ORM
- Auth with Clerk
- Notifications: Nodemailer (SMTP) for email, Twilio for SMS
- File storage: AWS S3
- OCR/Docs: Tesseract.js, pdf-lib, pdf-parse, pdf2pic, sharp, mammoth
- Geocoding: Nominatim (OpenStreetMap) with OpenCage fallback
- Hosted on Vercel

### Frontend
- Framework: Next.js 15 (App Router) with React 18
- Language: TypeScript
- UI & Styling:
  - Tailwind CSS, tailwind-merge, tailwindcss-animate
  - Radix UI primitives
  - shadcn/ui components (see `components/ui/*` and `components.json`)
  - Icons: lucide-react
  - Animations: GSAP (`gsap`), Embla Carousel
- Forms & Validation:
  - react-hook-form
  - zod (schema validation)
- Charts: recharts
- Theming: `next-themes` with `components/theme-provider.tsx`
- Misc: date-fns, cmdk, sonner (toasts)

### Backend (APIs & Server Logic)
- Runtime: Node.js 18+
- Framework: Next.js API Routes and Server Actions
- Notable API routes: `app/api/**` (agents, alerts, cron, OCR, email test, inventory checks)
- Server utilities:
  - Email: `lib/mail.ts` (Nodemailer SMTP transporter)
  - SMS: `lib/twillio.ts` (Twilio client and `sendSMS` helper)
  - Geocoding: `lib/geocoding.ts` (Nominatim → OpenCage fallback)
  - S3 file uploads: `lib/actions/awsupload.actions.ts`
  - Agents & eventing: `lib/agents/*`, `lib/agents/eventBus.ts`

### Authentication & Middleware
- Provider: Clerk (`@clerk/nextjs`, `@clerk/clerk-sdk-node`)
- Middleware: `middleware.ts` with `clerkMiddleware` and route matching

### Database & ORM
- Database: PostgreSQL (Neon or compatible)
- ORM: Prisma (`@prisma/client`, `prisma`)
- Schema: `prisma/schema.prisma` with `provider = postgresql` and `DATABASE_URL`
- Client lifecycle helper: `db/index.ts` (singleton in dev)
- Migrations/Generate: `npm run postinstall` runs `prisma generate`; docs use `prisma db push`

### Notifications
- Email: Nodemailer (SMTP)
  - Transport config via `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`
  - Email templates in `public/emails/*.html`
  - Actions in `lib/actions/mails.actions.ts`
- SMS: Twilio
  - `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_PHONE_NUMBER`
  - Helper in `lib/twillio.ts`; actions in `lib/actions/sms.actions.ts`

### File Storage
- AWS S3 via AWS SDK v3
  - `@aws-sdk/client-s3`, `@aws-sdk/s3-request-presigner`
  - Upload/update helpers in `lib/actions/awsupload.actions.ts`
  - Environment: `AWS_REGION`, `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `S3_BUCKET_NAME`

### OCR & Document Processing
- OCR: `tesseract.js`
- PDF utilities: `pdf-lib`, `pdf-parse`, `pdf2pic`
- Image processing: `sharp`

### Geospatial & Distance
- Geocoding: Nominatim (OpenStreetMap) first, OpenCage (`OPENCAGE_API_KEY`) fallback
- Distance/scoring logic embedded in agent utilities (see `lib/agents/*`)

### Agents, Eventing & Automation
- Agents: Coordinator, Donor, Hospital, Inventory, Logistics (see `lib/agents/*` and Documentations)
- Event bus: database-backed pattern (`lib/agents/eventBus.ts`)
- Cron-like tasks: API-triggered endpoints (e.g., `app/api/cron/monitor-inventory`)

### Deployment & Observability
- Hosting: Vercel (`@vercel/analytics` used client-side)
- Build: Next.js with Turbopack in dev (`next dev --turbopack`)
- PostCSS/Tailwind pipeline (`postcss.config.mjs`, `tailwind.config.ts`)

### Key Environment Variables
- Next.js:
  - `NODE_ENV`, `NEXT_PUBLIC_*`
- Auth (Clerk):
  - `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`, `CLERK_SECRET_KEY`, sign-in/up URLs
- Database (PostgreSQL via Prisma):
  - `DATABASE_URL`
- Email (SMTP / Nodemailer):
  - `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`
- SMS (Twilio):
  - `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_PHONE_NUMBER`
- File Storage (AWS S3):
  - `AWS_REGION`, `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `S3_BUCKET_NAME`
- Geocoding:
  - `OPENCAGE_API_KEY` (optional fallback)
- Admin:
  - `NEXT_PUBLIC_ADMIN_PASSKEY`

### Notable Packages (selected)
- next, react, react-dom, typescript
- tailwindcss, postcss, autoprefixer
- @radix-ui/*, lucide-react, shadcn/ui components
- react-hook-form, zod
- @prisma/client, prisma
- @clerk/nextjs, @clerk/clerk-sdk-node
- @aws-sdk/client-s3, @aws-sdk/s3-request-presigner
- nodemailer, twilio
- tesseract.js, sharp, pdf-lib, pdf-parse, pdf2pic
- recharts, gsap, embla-carousel-react, date-fns, sonner

### Notes
- README mentions MongoDB and EmailJS/web_push in a generic badge line; the current implementation uses PostgreSQL (Prisma) and Nodemailer for email.


