# HaemoLogix

**Real-time Blood Alert System**

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
![Node.js](https://img.shields.io/badge/Node.js-v18+-green)
![Next.js](https://img.shields.io/badge/Next.js-13+-black)
![MongoDB](https://img.shields.io/badge/MongoDB-Geospatial-brightgreen)
![Vercel](https://img.shields.io/badge/Deployed%20on-Vercel-black)

HaemoLogix connects verified hospitals to nearby, eligible blood donors — filtered by blood group, urgency, and location.  
Hospitals raise an alert, donors accept in one tap, and donations are tracked with history, eligibility, and analytics.

> **Because minutes matter.**

---

**Demo Link** : https://drive.google.com/file/d/1J2HxKUBMzTC8Zidqs-vPCLRcGkeqh7h1/view?usp=sharing

**PPT Link** : https://drive.google.com/file/d/1QtRjX7OYC2_TUQ3WXf6yub0sMvHlnyjs/view?usp=sharing

---

## Features

- Real-Time alerts
- Geolocation Matching
- Multi-Role Dashboard- Separate interfaces for _donors_, _hospitals_, and _administrators_
- Highly Secured and Verified system
- Emergency alert feature for hospitals

  ***

  ## Tech Stack

  - **Frontend**:Next.js, Typescript, TailwindCSS
  - **Backend**: Next.js server actions, Node.js
  - **Authentication**: Clerk
  - **Database**: NeonDB
  - **Notification alert**: Twilio, EmailJS, web_push
  - **Hosting**: Vercel

  ***

  ## User Journey

  <img width="1920" height="1080" alt="Haemologix" src="https://github.com/user-attachments/assets/f6f73ff3-1005-419f-a7f9-03cfcf89e139" />

  ***

  ## Documentations

  **swot analysis** : https://docs.google.com/document/d/1VcdUm2-o3dEF2gpmZ-InNQjaOtvEC0NO/edit?usp=drive_link&ouid=100272828581181267576&rtpof=true&sd=true

  **donor eligibility criteria** : https://docs.google.com/document/d/1P8CS-nFsUkhu_N_IMo6aKdnsWkW7IYyP/edit?usp=drive_link&ouid=100272828581181267576&rtpof=true&sd=true

  **hospital eligibility criteria** : https://docs.google.com/document/d/1VVVOqS1GXP1KpX8WWnye01z7WhBxkxqJ/edit?usp=drive_link&ouid=100272828581181267576&rtpof=true&sd=true

  ***

## Getting Started

### 1. Clone the Repository

```bash
git clone https://github.com/Aftab48/Haemologix.app.git
cd haemologix
```

### 2. Install Dependencies

Make sure you have Node.js v18+ and npm installed.

```bash
npm install
```

### 3. Configure Environment Variables

Create a `.env.local` or `.env` file at the root and add your credentials:

```env
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=p
CLERK_SECRET_KEY=
NEXT_PUBLIC_CLERK_SIGN_IN_URL=
NEXT_PUBLIC_CLERK_SIGN_UP_URL=
NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL=
NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL=
NEXT_PUBLIC_ADMIN_PASSKEY=
DATABASE_URL=
OPENCAGE_API_KEY=
```

### 4. Run the Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser to view the app.

---

## Deployment

We recommend deploying via **Vercel**:

1. Connect the GitHub repo to Vercel
2. Set environment variables in the dashboard
3. Deploy!

---

## Contributing

We welcome pull requests!

1. Fork the repo
2. Create your feature branch: `git checkout -b feature/YourFeature`
3. Commit your changes: `git commit -m 'Add YourFeature'`
4. Push to the branch: `git push origin feature/YourFeature`
5. Open a pull request

---

## License

This project is licensed under the MIT License.

---

## Authors

- Aftab Alam : https://github.com/Aftab48 → mdalam4884@gmail.com
- Ayushi Mandal : https://github.com/ayushi-stacks → ayushistacks@gmail.com
- Rajdeep Roy : https://github.com/RR-2403 → rajdeeproy2403@gmail.com
- Team **GEEKS**

---

## Live App

(https://haemologix.vercel.app/)

```
Join HAEMOLOGIX-because minutes matter.

```
