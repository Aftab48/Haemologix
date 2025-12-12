# Contributing to HaemoLogix

First off, thank you for considering contributing to HaemoLogix! It's people like you that make HaemoLogix such a great tool for saving lives. 🩸

## Table of Contents

- [Code of Conduct](#code-of-conduct)
- [Getting Started](#getting-started)
- [How Can I Contribute?](#how-can-i-contribute)
- [Development Setup](#development-setup)
- [Coding Standards](#coding-standards)
- [Commit Guidelines](#commit-guidelines)
- [Pull Request Process](#pull-request-process)
- [Testing](#testing)
- [Documentation](#documentation)

## Code of Conduct

By participating in this project, you agree to maintain a respectful and collaborative environment. Please be kind, professional, and constructive in all interactions.

**All contributors must follow our [Code of Conduct](CODE_OF_CONDUCT.md)**, which includes:
- Standards for respectful behavior
- Healthcare-specific guidelines (privacy, safety, accuracy)
- Enforcement procedures
- Reporting mechanisms

Please read the full [Code of Conduct](CODE_OF_CONDUCT.md) before contributing.

## Getting Started

1. **Fork the repository** on GitHub
2. **Clone your fork** locally
3. **Create a branch** for your changes
4. **Make your changes** and test them
5. **Push to your fork** and submit a pull request

## How Can I Contribute?

### Reporting Bugs

Before creating bug reports, please check existing issues to avoid duplicates. When creating a bug report, include:

- **Clear title and description**
- **Steps to reproduce** the issue
- **Expected behavior** vs actual behavior
- **Screenshots** if applicable
- **Environment details** (OS, Node version, browser, etc.)
- **Error messages or logs**

### Suggesting Features

Feature suggestions are welcome! Please provide:

- **Clear use case** - Why is this feature needed?
- **Detailed description** - What should it do?
- **Mockups or examples** - Visual aids help!
- **Impact assessment** - Who benefits and how?

### Code Contributions

We welcome pull requests for:

- Bug fixes
- New features
- Performance improvements
- Documentation improvements
- Test coverage
- UI/UX enhancements
- Accessibility improvements

## Development Setup

### Prerequisites

- Node.js 18+ and npm/pnpm
- PostgreSQL database (we recommend Neon)
- Git

### Local Setup

1. **Clone the repository**
```bash
git clone https://github.com/Aftab48/Haemologix.app.git
cd haemologix
```

2. **Install dependencies**
```bash
npm install
# or
pnpm install
```

3. **Set up environment variables**
```bash
cp .example.env .env.local
```

Edit `.env.local` with your credentials:
- Clerk authentication keys
- Database URL (NeonDB)
- Twilio credentials (for SMS)
- SMTP credentials (for email)
- AWS S3 credentials (for file uploads)
- OpenCage API key (for geocoding)

4. **Set up the database**
```bash
npx prisma generate
npx prisma db push
```

5. **Run the development server**
```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to see your changes.

### Project Structure

```
haemologix/
├── app/                    # Next.js 15 app directory
│   ├── (home)/            # Landing pages
│   ├── admin/             # Admin dashboard
│   ├── donor/             # Donor portal
│   ├── hospital/          # Hospital portal
│   └── api/               # API routes
├── components/            # Reusable React components
│   └── ui/               # shadcn/ui components
├── lib/                  # Utility functions and server logic
│   ├── actions/          # Server actions
│   ├── agents/           # AI agent system
│   └── validations/      # Zod schemas
├── prisma/               # Database schema
├── public/               # Static assets
├── ml/                   # Machine learning models
└── docs/                 # Documentation
```

## Coding Standards

### TypeScript

- Use TypeScript for all new files
- Avoid `any` types - use proper typing
- Use interfaces for object shapes
- Export types alongside components

### React/Next.js

- Use functional components with hooks
- Follow React best practices (avoid prop drilling, use context appropriately)
- Use Server Components by default, Client Components only when needed
- Mark client components with `'use client'` directive

### Styling

- Use Tailwind CSS utility classes
- Follow the existing design system
- Ensure responsive design (mobile-first)
- Test in both light and dark modes

### Code Formatting

We use Prettier and ESLint for consistent formatting:

```bash
npm run lint
```

**Code style guidelines:**
- 2 spaces for indentation
- Single quotes for strings
- Semicolons required
- Trailing commas in multiline objects/arrays

## Commit Guidelines

We follow [Conventional Commits](https://www.conventionalcommits.org/):

### Format
```
<type>(<scope>): <subject>

<body>

<footer>
```

### Types
- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation changes
- `style`: Code style changes (formatting, etc.)
- `refactor`: Code refactoring
- `test`: Adding or updating tests
- `chore`: Maintenance tasks
- `perf`: Performance improvements

### Examples
```
feat(donor): add blood donation history chart

fix(hospital): resolve alert creation validation error

docs(readme): update setup instructions for Windows
```

## Pull Request Process

1. **Update your fork** with the latest main branch
```bash
git checkout main
git pull upstream main
git checkout your-feature-branch
git rebase main
```

2. **Ensure your code:**
   - ✅ Passes all linting (`npm run lint`)
   - ✅ Has no TypeScript errors (`npm run build`)
   - ✅ Includes tests for new features
   - ✅ Updates documentation if needed
   - ✅ Works in both light and dark modes
   - ✅ Is responsive on mobile devices

3. **Create a Pull Request** with:
   - Clear title describing the change
   - Description of what changed and why
   - Screenshots/GIFs for UI changes
   - Reference to related issues (`Fixes #123`)
   - Any breaking changes noted

4. **Respond to feedback**
   - Be open to suggestions
   - Make requested changes promptly
   - Ask questions if something is unclear

5. **After approval:**
   - Squash commits if requested
   - We'll merge your PR!

## Testing

### Manual Testing

Before submitting, test your changes:

1. **Core flows:**
   - User registration (donor/hospital)
   - Alert creation and matching
   - Notification delivery
   - Admin approval workflows

2. **Cross-browser testing:**
   - Chrome, Firefox, Safari, Edge

3. **Responsive testing:**
   - Mobile, tablet, desktop viewports

### Automated Testing

We're working on expanding test coverage. Contributions to tests are highly valued!

```bash
npm run test        # Run tests (when implemented)
```

## Documentation

### Code Comments

- Comment complex logic
- Use JSDoc for functions and components
- Explain "why" not "what" when possible

### README Updates

If your change affects setup or usage, update:
- README.md
- Relevant documentation in `/docs`
- CHANGELOG.md

### Agent System Documentation

If modifying agents, update:
- `/Documentations/Agents Implementations/`
- Agent testing guide if APIs change

## Areas Where We Need Help

### High Priority
- 🧪 Test coverage (unit tests, integration tests)
- 🌍 Internationalization (i18n) - Hindi, Bengali, Tamil
- ♿ Accessibility improvements (ARIA labels, keyboard navigation)
- 📱 Mobile app development (React Native)
- 🔒 Security audits and improvements

### Medium Priority
- 📊 Enhanced analytics and reporting
- 🎨 UI/UX improvements
- 📝 Documentation improvements
- 🚀 Performance optimization
- 🤖 ML model improvements

### Good First Issues

Look for issues labeled `good first issue` - these are great for new contributors!

## Questions?

- 💬 Open a GitHub Discussion
- 📧 Email: mdalam4884@gmail.com
- 🐛 Report bugs via GitHub Issues

## Recognition

Contributors will be:
- Listed in our README
- Credited in release notes
- Part of saving lives! 🩸

Thank you for contributing to HaemoLogix! Together, we're making blood donation more efficient and saving lives.

---

**License**: By contributing, you agree that your contributions will be licensed under the MIT License.

