# Changelog

All notable changes to HaemoLogix will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.5.2] - 2025-12-13

### Added
- Foundational documentation (CHANGELOG, CODE_OF_CONDUCT, CONTRIBUTING, LICENSE, SECURITY)
- Updated logo

### Changed
- Dependencies update

## [0.5.1] - 2025-12-12

### Added
- Comprehensive documentation for agent system
- Agent testing guide with detailed API examples
- ML model training pipeline with synthetic data generation
- Google Maps integration for location services
- QR code generation for donor onboarding
- Pilot program analytics dashboard
- Real-time agent logging and monitoring

### Changed
- Updated to Next.js 15.2.6 with improved performance
- Enhanced donor eligibility checking with AI screening
- Improved geolocation matching algorithm
- Refined notification system for better delivery rates

### Fixed
- Database connection stability in production
- SMS notification delivery timing
- Email template rendering issues
- Map marker clustering performance

## [0.5.0] - 2025-12-01

### Added
- AI Agent System with 6 specialized agents:
  - Coordinator Agent (orchestration)
  - Donor Agent (matching & notification)
  - Hospital Agent (alert processing)
  - Inventory Agent (stock monitoring)
  - Logistics Agent (delivery coordination)
  - Screening Agent (AI-powered validation)
- Event-driven architecture with EventBus
- Multi-role dashboard (Admin, Hospital, Donor)
- Hospital verification system with document OCR
- Donor eligibility tracking and history
- SMS alerts via Twilio integration
- Email notifications via Nodemailer
- AWS S3 integration for document storage
- Real-time geolocation-based donor matching

### Security
- Clerk authentication integration
- Role-based access control (RBAC)
- Admin passkey protection
- Secure file upload with validation

## [0.4.0] - 2025-11-15

### Added
- Hospital registration with verification workflow
- Donor registration with eligibility criteria
- Blood alert creation and management
- Basic geolocation services using Nominatim
- NeonDB PostgreSQL database with Prisma ORM
- Responsive UI with Radix UI components
- Dark mode support with next-themes

### Changed
- Migrated from MongoDB to PostgreSQL
- Improved form validation with Zod schemas
- Enhanced UI/UX with Tailwind CSS

## [0.3.0] - 2025-10-20

### Added
- Basic blood request system
- Donor profile pages
- Hospital profile pages
- Simple notification system

## [0.2.0] - 2025-09-15

### Added
- Initial Next.js app structure
- Basic authentication
- Landing page design
- Database schema design

## [0.1.0] - 2025-08-01

### Added
- Project initialization
- Tech stack selection
- Basic requirements documentation
- Initial wireframes

---

## Release Types

- **Major versions** (x.0.0) - Breaking changes, major feature additions
- **Minor versions** (0.x.0) - New features, backwards compatible
- **Patch versions** (0.0.x) - Bug fixes, minor improvements

## Future Roadmap

### Planned for v0.6.0
- [ ] Machine learning model deployment for demand forecasting
- [ ] Multi-language support (Hindi, Bengali, Tamil, Telugu)
- [ ] Enhanced analytics dashboard with predictions
- [ ] Mobile app (React Native)
- [ ] Integration with government health databases

### Planned for v0.7.0
- [ ] Blockchain-based donation tracking
- [ ] Gamification for donor engagement
- [ ] Social media integration
- [ ] Advanced reporting and export features

### Long-term Goals
- [ ] National blood bank network integration
- [ ] WHO compliance and certification
- [ ] International expansion
- [ ] Open API for third-party integrations
