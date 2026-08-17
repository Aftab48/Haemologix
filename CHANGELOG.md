# Changelog

All notable changes to Haemologix will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- Escalation ladder: when the local donor and inventory search is empty the coordinator now widens the donor
  radius in tiers (up to `ML_MAX_DONOR_RADIUS_KM`, default 100), re-checks network inventory each rung, asks nearby
  facilities to check their stock (`ML_NETWORK_BROADCAST_RADIUS_KM` / `ML_NETWORK_BROADCAST_MAX_FACILITIES`), and
  finally hands the alert to a human coordinator (email + SMS to the requesting hospital's contacts and
  `CONTACT_ADMIN_EMAIL`, `outcome = ESCALATED`). Every rung is logged as a coordinator `escalation_step` decision
  and shown on the alert page with the next action being taken. (`lib/agents/escalation.ts`,
  `lib/ml/policy/escalationLadder.ts`, coordinator API `action: "escalate"`, scheduler job `advanceEscalations`.)
- Typed workflow step vocabulary and stage labels (`lib/agents/workflowSteps.ts`); alert page stepper now shows the
  full coordination ladder (Detected → Local search → Expanding search → Network broadcast → Fulfilment / Human
  escalation → Closed) plus a "Next action" panel and terminal-outcome badges.
- Honest decision provenance: every `AgentDecision` carries `decision_method`
  (`model` | `deterministic` | `deterministic_fallback`) and `model_confidence`; the `confidence` column now holds
  model confidence only (null on rule paths). UI shows "Deterministic rule" / "Rule fallback — model unavailable" /
  "Model · NN%" instead of "100% confidence" for rule fallbacks. (`decisionBasis()` in `lib/ml/agentBridge.ts`,
  `components/DecisionBasisBadge.tsx`.)

### Changed
- `escalationPolicy.decideEscalation` action `transfer_or_manual` renamed `escalation_ladder`; the response-window
  timeout now delegates to the ladder instead of silently marking the alert `escalated_manual`.
- `shortage.request.v1` events may carry `escalation: { rung, previous_radius_km }`; the Donor Agent then only
  notifies donors not yet contacted for that alert and leaves sequencing to the coordinator.
- Inventory Agent: empty result now escalates to the coordinator instead of ending the workflow.

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
