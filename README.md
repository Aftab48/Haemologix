# HaemoLogix 🩸

**Real-time Blood Alert System**

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Node.js](https://img.shields.io/badge/Node.js-v18+-green.svg)](https://nodejs.org/)
[![Next.js](https://img.shields.io/badge/Next.js-15-black.svg)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue.svg)](https://www.typescriptlang.org/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-NeonDB-336791.svg)](https://neon.tech/)
[![Deployed on Vercel](https://img.shields.io/badge/Deployed%20on-Vercel-black.svg)](https://haemologix.vercel.app/)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg)](CONTRIBUTING.md)
[![Open Source](https://img.shields.io/badge/Open%20Source-%E2%9D%A4-red.svg)](LICENSE)

HaemoLogix connects verified hospitals to nearby, eligible blood donors — filtered by blood group, urgency, and location.  
Hospitals raise an alert, donors accept in one tap, and donations are tracked with history, eligibility, and analytics.

> **Because minutes matter. Every second counts when it comes to saving lives.** 💉

---

## 🌟 Quick Links

- 🌐 **[Live Application](https://www.haemologix.in/)** - Try HaemoLogix now
- 🎥 **[Demo Video](https://drive.google.com/file/d/1J2HxKUBMzTC8Zidqs-vPCLRcGkeqh7h1/view?usp=sharing)** - Watch it in action
- 📊 **[Presentation](https://drive.google.com/file/d/1QtRjX7OYC2_TUQ3WXf6yub0sMvHlnyjs/view?usp=sharing)** - Project overview
- 📖 **[Documentation](docs/)** - Detailed guides
- 🤝 **[Contributing Guide](CONTRIBUTING.md)** - How to contribute
- 📜 **[Code of Conduct](CODE_OF_CONDUCT.md)** - Community standards
- 🔒 **[Security Policy](SECURITY.md)** - Report vulnerabilities

---

## 📋 Table of Contents

- [Features](#-features)
- [Tech Stack](#️-tech-stack)
- [Architecture](#-architecture)
- [Getting Started](#-getting-started)
- [Documentation](#-documentation)
- [Contributing](#-contributing)
- [License](#-license)
- [Team](#-team)
- [Support](#-support)

---

## ✨ Features

### For Hospitals 🏥
- **Instant Alert Creation** - Raise blood requests in seconds with urgency levels
- **Smart Donor Matching** - AI-powered geolocation-based donor matching
- **Real-time Tracking** - Monitor alert status and responses live
- **Verified System** - Document-based hospital verification with OCR
- **Analytics Dashboard** - Track donation history and inventory levels

### For Donors 🩸
- **One-Tap Response** - Accept or decline requests instantly
- **Eligibility Tracking** - Automated eligibility calculations based on WHO guidelines
- **Donation History** - Complete record of all donations
- **Smart Notifications** - SMS and email alerts for nearby requests
- **Privacy First** - Control your visibility and notification preferences

### For Administrators 👨‍💼
- **Verification Workflow** - Approve hospitals and donors with AI assistance
- **System Monitoring** - Real-time agent logs and system health
- **Analytics & Insights** - Platform-wide metrics and trends
- **User Management** - Comprehensive admin controls

### Technical Features 🤖
- **AI Agent System** - 6 intelligent agents (Coordinator, Donor, Hospital, Inventory, Logistics, Screening)
- **Event-Driven Architecture** - Scalable and resilient system design
- **Machine Learning** - Demand forecasting and intelligent matching
- **Geospatial Queries** - Efficient radius-based donor search
- **Multi-Channel Notifications** - SMS (Twilio) + Email (SMTP)
- **Document Processing** - OCR for automatic data extraction
- **QR Code Integration** - Quick donor onboarding

---

## 🛠️ Tech Stack

### Frontend
- **Framework**: Next.js 15 (App Router)
- **Language**: TypeScript 5
- **Styling**: Tailwind CSS
- **UI Components**: Radix UI + shadcn/ui
- **Icons**: Lucide React
- **Animations**: GSAP
- **Forms**: React Hook Form + Zod validation
- **Charts**: Recharts
- **Maps**: Google Maps API

### Backend
- **Runtime**: Node.js 18+
- **API**: Next.js Server Actions & API Routes
- **Database**: PostgreSQL (NeonDB)
- **ORM**: Prisma
- **Authentication**: Clerk
- **File Storage**: AWS S3
- **Notifications**: Twilio (SMS) + Nodemailer (Email)
- **Geocoding**: Nominatim + OpenCage

### AI & ML
- **OCR**: Tesseract.js
- **Document Processing**: pdf-lib, pdf-parse, sharp
- **ML Models**: Custom training pipeline (PyTorch)
- **Inference**: Hugging Face API
- **LLM**: Claude 4.5 Sonnet (via OpenRouter)

### DevOps & Infrastructure
- **Hosting**: Vercel
- **CI/CD**: GitHub Actions (via Vercel)
- **Analytics**: Vercel Analytics
- **Monitoring**: Custom agent logging system

> 📚 For detailed tech stack information, see [TECHSTACK.md](TECHSTACK.md)

---

## 🏗️ Architecture

HaemoLogix uses an **event-driven microservice architecture** powered by AI agents:

- **Coordinator Agent**: Orchestrates system-wide events
- **Donor Agent**: Matches and notifies eligible donors
- **Hospital Agent**: Processes alerts and requests
- **Inventory Agent**: Monitors blood stock levels
- **Logistics Agent**: Coordinates donation logistics
- **Screening Agent**: AI-powered document verification

All agents communicate via an event bus, ensuring scalability and fault tolerance.

---

## 📸 User Journey

<img width="1920" height="1080" alt="Haemologix User Journey" src="https://github.com/user-attachments/assets/f6f73ff3-1005-419f-a7f9-03cfcf89e139" />

---

## 📚 Documentation

### Project Documentation
- **[SWOT Analysis](https://docs.google.com/document/d/1VcdUm2-o3dEF2gpmZ-InNQjaOtvEC0NO/edit?usp=sharing)** - Strategic analysis
- **[Donor Eligibility Criteria](https://docs.google.com/document/d/1P8CS-nFsUkhu_N_IMo6aKdnsWkW7IYyP/edit?usp=sharing)** - WHO-based guidelines
- **[Hospital Eligibility Criteria](https://docs.google.com/document/d/1VVVOqS1GXP1KpX8WWnye01z7WhBxkxqJ/edit?usp=sharing)** - Verification requirements

### Technical Documentation
- **[Agent System](Documentations/)** - AI agent architecture and implementation
- **[Agent Testing Guide](AGENT_TESTING_GUIDE.txt)** - How to test agents
- **[Tech Stack Details](TECHSTACK.md)** - Comprehensive technology overview
- **[ML Training Guide](ml/README.md)** - Machine learning pipeline
- **[CI/CD Pipeline](docs/CI_CD.md)** - Workflows and security scanning
- **[Privacy Policy](docs/privacy-policy.md)** - Data protection information
- **[Terms & Conditions](docs/terms-and-conditions.md)** - Usage terms

---

## 🚀 Getting Started

### Prerequisites

- Node.js 18+ and npm/pnpm
- PostgreSQL database (we recommend [NeonDB](https://neon.tech/))
- Git

### 1. Clone the Repository

```bash
git clone https://github.com/Aftab48/Haemologix.app.git
cd haemologix
```

### 2. Install Dependencies

```bash
npm install
# or
pnpm install
```

### 3. Configure Environment Variables

Copy the example environment file and fill in your credentials:

```bash
cp .example.env .env.local
```

Required environment variables:
- **Clerk** (Authentication): Get keys from [clerk.com](https://clerk.com/)
- **NeonDB** (Database): Get connection string from [neon.tech](https://neon.tech/)
- **Twilio** (SMS): Get credentials from [twilio.com](https://www.twilio.com/)
- **AWS S3** (File Storage): Configure S3 bucket
- **SMTP** (Email): Configure email service
- **OpenCage** (Geocoding): Get API key from [opencagedata.com](https://opencagedata.com/)

See [`.example.env`](.example.env) for all required variables.

### 4. Set Up Database

```bash
npx prisma generate
npx prisma db push
```

### 5. Run the Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to see the application.

### 6. (Optional) Generate Synthetic Data for ML

```bash
npm run generate:data
npm run export:data
```

### 7. (Optional) Set Up ML Pipeline

```bash
cd ml
# Follow instructions in ml/README.md
```

---

## 🚢 Deployment

We recommend deploying via **Vercel** for the best experience:

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/Aftab48/Haemologix.app)

### Manual Deployment

1. Connect your GitHub repository to Vercel
2. Configure environment variables in the Vercel dashboard
3. Deploy! Vercel will automatically build and deploy your app

### Environment Variables in Production

Make sure to set all required environment variables in your deployment platform. See [`.example.env`](.example.env) for the complete list.

---

## 🤝 Contributing

We welcome contributions from the community! HaemoLogix is open source and built with ❤️ for saving lives.

### How to Contribute

1. **Fork the repository**
2. **Create a feature branch** (`git checkout -b feature/AmazingFeature`)
3. **Commit your changes** (`git commit -m 'feat: Add AmazingFeature'`)
4. **Push to your branch** (`git push origin feature/AmazingFeature`)
5. **Open a Pull Request**

### Contribution Areas

We especially welcome contributions in:
- 🧪 **Test coverage** - Unit tests, integration tests
- 🌍 **Internationalization** - Hindi, Bengali, Tamil, Telugu translations
- ♿ **Accessibility** - ARIA labels, keyboard navigation
- 📱 **Mobile app** - React Native development
- 🤖 **ML improvements** - Better forecasting models
- 📝 **Documentation** - Guides, tutorials, API docs

### Guidelines

Please read our [**Contributing Guide**](CONTRIBUTING.md) for detailed information on:
- Code style and standards
- Commit message conventions
- Pull request process
- Testing requirements
- Documentation standards

**Important**: All contributors are expected to follow our [**Code of Conduct**](CODE_OF_CONDUCT.md) to ensure a welcoming and inclusive community.

---

## 🔒 Security

Security is critical for a healthcare application. If you discover a security vulnerability, please follow our [**Security Policy**](SECURITY.md).

**Do NOT open a public issue for security vulnerabilities.**

Report security issues to: **mdalam4884@gmail.com**

---

## 📄 License

This project is licensed under the **MIT License** - see the [LICENSE](LICENSE) file for details.

```
Copyright (c) 2025 Haemologix Private Limited
```

---

## 👥 Team

**HaemoLogix** is developed and maintained by [Haemologix Private Limited](https://haemologix.vercel.app/).

### Core Contributors

- **[Aftab Alam](https://github.com/Aftab48)** - Lead Developer & Co-Founder
  - 📧 mdalam4884@gmail.com
  
- **[Ayushi Mandal](https://github.com/ayushi-stacks)** - Developer & Co-Founder
  - 📧 ayushistacks@gmail.com

### Special Thanks

We're grateful to all contributors who help make HaemoLogix better!

---

## 💬 Support

### Get Help

- 🐛 **[Report a Bug](https://github.com/Aftab48/Haemologix.app/issues/new?template=bug_report.yml)**
- ✨ **[Request a Feature](https://github.com/Aftab48/Haemologix.app/issues/new?template=feature_request.yml)**
- 💬 **[Join Discussions](https://github.com/Aftab48/Haemologix.app/discussions)**
- 📧 **Email**: mdalam4884@gmail.com

### Community

- ⭐ **Star this repo** if you find it useful!
- 🐦 Share HaemoLogix with your network
- 🤝 Contribute to make it better

---

## 📊 Project Status

- ✅ **Version**: 0.5.1
- ✅ **Status**: Active Development
- ✅ **Production**: Live at [haemologix.vercel.app](https://haemologix.vercel.app/)
- ✅ **License**: MIT (Open Source)

---

## 🎯 Roadmap

See [CHANGELOG.md](CHANGELOG.md) for version history and future roadmap.

### Coming Soon
- [ ] Machine learning model deployment
- [ ] Multi-language support
- [ ] Mobile application (React Native)
- [ ] Government health database integration
- [ ] Advanced analytics dashboard

---

## 🌟 Show Your Support

If HaemoLogix helps your organization or inspires your project, please:

- ⭐ **Star this repository**
- 🔄 **Share it with others**
- 🤝 **Contribute to the project**
- 💬 **Spread the word about efficient blood donation**

---

<div align="center">

### Join HaemoLogix - Because Minutes Matter 🩸

**[Try HaemoLogix Now](https://haemologix.vercel.app/)** | **[Documentation](docs/)** | **[Contributing](CONTRIBUTING.md)**

Made with ❤️ for humanity | Copyright © 2026 Haemologix Pvt. Ltd. | [MIT License](LICENSE)

</div>
