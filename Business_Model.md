PILOT PROGRAM (Testing & Validation Tier)

Goal: Quick onboarding + feature validation with real hospitals before full deployment.

Ideal For: Hospitals participating in 7–14 day evaluation or demo program.

Includes:
Temporary hospital dashboard (valid for 2 weeks), AI-based donor verification (limited to 30 donors), Sample request workflow (up to 2 real requests)SMS & email alerts (limited quota), Auto-generated feedback and usage reports, Optional onboarding session for staff.

Cost: Free (trial period only)
Purpose: Demonstrate automation, collect feedback, and build credibility.

FREE TIER (Entry Hospitals, NGOs & Rural Units)

Goal: Encourage adoption, strengthen the donor base.Ideal For: Rural hospitals, small NGOs, blood collection camps.
Includes:Donor registration & AI prevalidation (up to 30 donors/month)Limited blood requests (1 active/month)Basic SMS/email alerts (30 notifications/month)Regional donor accessBasic analytics (verification count, donor trends)Community support

Price: Free (no registration fee)
Purpose: Establish trust and generate verified donor data network. Customer acquisition channel.

PREMIUM TIER (Growing Hospitals & Blood Banks)

Goal: Automate end-to-end donor management and forecasting.Ideal For: Mid-level hospitals or district blood centers.
Includes:
AI screenings and donor auto-approval (1,200/month included, overage pricing applies)Real-time matching and smart notification routingAdvanced analytics (usage stats, AI demand forecasting)API integration with hospital systemsPriority SMS/email alerts (1,000 SMS + 500 emails/month included)Role-based access control for hospital staffHospital co-branding and extended reportingDedicated support (2 hours/month included)

Fair Use Limits: 1,200 verifications, 1,000 SMS, 500 emails, 2 hours support per month
Overage Pricing: ₹0.25/verification, ₹0.50/SMS, ₹0.05/email, ₹1,500/hour support

Price: 8,999 INR/month (100 USD)
Purpose: Monetize automation and provide real operational value.

ENTERPRISE TIER (Hospital Networks & Public Health Systems)

Goal: Power large-scale operations with predictive insights and integrations.Ideal For: State-level health departments, hospital chains, CSR projects.

Includes:
White-labeled Haemologix Enterprise Dashboard, Multi-location and multi-language management, Centralized AI donor screening and forecasting engine, Custom data analytics & visualizations, Dedicated onboarding/training, SLA-backed uptime and security compliance, Integration with national health/CSR databases, Custom API and SMS gateways
Pricing: Custom annual contract
Purpose: Long-term partnerships and high-value institutional integration.

FEASIBILITY & COST CHECK (Based on Actual Infrastructure)

INFRASTRUCTURE BREAKDOWN (Based on Codebase Analysis):
-------------------------------------------------------
Services Identified:
1. Hosting: Vercel (Next.js deployment)
   - Free tier: 100GB bandwidth, unlimited requests
   - Pro: $20/month (~₹1,650) for production
   - Enterprise: Custom pricing

2. Database: Neon PostgreSQL (via Prisma)
   - Pay-per-use model (compute hours + storage)
   - Free tier: 0.5GB storage, shared CPU
   - Estimated: ₹500-2,000/month depending on usage (compute hours + storage)

3. Authentication: Clerk
   - Free tier: 10,000 MAU
   - Pro: $25/month (~₹2,070) for 10,000 MAU, then $0.02/user
   - Enterprise: Custom pricing

4. SMS: Twilio
   - India domestic: ~₹0.35-0.50 per SMS (varies by volume)
   - Estimated: ₹0.40 per SMS for moderate volume

5. Email: SMTP (Nodemailer)
   - Cost: ~₹0.01-0.05 per email (depends on provider)
   - Estimated: ₹0.03 per email

6. File Storage: AWS S3 (ap-south-1)
   - Storage: ₹0.023/GB/month
   - PUT requests: ₹0.005 per 1,000
   - GET requests: ₹0.0004 per 1,000
   - Data transfer: ₹0.09/GB out

7. OCR: Tesseract.js (client-side, no cost)
   - Runs on Vercel serverless functions
   - Cost: Included in Vercel compute time

8. ML API: Hugging Face Inference API (GPU online)
   - Pay-per-use: ~₹0.15-0.25 per inference call
   - No fixed hosting costs
   - Estimated: ₹0.20 per verification (GPU inference)

9. Geocoding: Nominatim (free) + OpenCage (fallback, paid)
   - Nominatim: Free (rate-limited)
   - OpenCage: ₹0.50-2.00 per request if used

10. Monitoring/Analytics: Vercel Analytics (included)

MONTHLY INFRASTRUCTURE BASELINE (for 10-20 paying customers):
-------------------------------------------------------------
- Vercel Pro: ₹1,650/month
- Neon (pay-per-use): ₹1,000/month (estimated based on usage)
- Clerk Pro: ₹2,070/month (assuming <10k MAU)
- ML API: ₹0 (pay-per-use via Hugging Face, no fixed cost)
- AWS S3 (50GB + requests): ₹500/month
- SMTP service: ₹500/month
- Total baseline: ~₹5,720/month
- Per paying customer allocation: ~₹286-572/month (depending on customer count)

PER-UNIT COSTS:
---------------
- SMS (Twilio India): ₹0.40 per message (no bulk discounts expected)
- Email (SMTP): ₹0.03 per email
- AI Verification (Hugging Face GPU): ₹0.20 per verification
- OCR Processing: ~₹0.05 per document (Vercel compute time)
- S3 Storage: ₹0.023/GB/month + minimal request costs
- Neon Database: Pay-per-use (compute hours + storage)
- Support/Onboarding: ₹1,200/hour (fully loaded)

TIER-BY-TIER COST ANALYSIS:
---------------------------

PILOT (Free, 2 weeks):
- 30 verifications: 30 × ₹0.20 = ₹6.00
- 150 notifications (SMS+email): 100 SMS × ₹0.40 + 50 email × ₹0.03 = ₹41.50
- OCR (3 docs per donor × 30): 90 × ₹0.05 = ₹4.50
- 1 hr onboarding: ₹1,200
- Infrastructure share (2 weeks): ₹286 × 0.5 = ₹143
- S3 storage (minimal): ₹10
- Neon compute (minimal): ₹50
- Total cost per pilot: ~₹1,455
- Recommendation: Limit to 4-6 concurrent pilots/month (₹6k-9k burn). Treat as marketing expense.

FREE TIER (Free - No Registration Fee):
Revised limits to keep costs sustainable:
- 30 verifications/month: 30 × ₹0.20 = ₹6.00
- 1 active blood request/month (instead of 3)
- 30 notifications/month: 20 SMS × ₹0.40 + 10 email × ₹0.03 = ₹8.30
- OCR (3 docs × 30 donors, one-time): 90 × ₹0.05 = ₹4.50 (amortized = ₹1.50/month)
- Infrastructure share: ₹286/month
- S3 storage (5GB/user): ₹0.12/month
- Neon compute (minimal): ₹50/month
- Community support (async, minimal): ₹100/month
- Total monthly cost: ~₹452/month per active user
- Revenue: ₹0 (truly free)
- Strategy: Accept as customer acquisition cost. Limit to 50-100 free tier users max to cap burn at ₹22k-45k/month. Convert to Premium through value demonstration.

PREMIUM TIER (₹8,999/month):
FAIR USE LIMITS (to ensure minimum ₹2,000 profit):
- Included verifications: 1,200/month
- Included SMS: 1,000/month
- Included emails: 500/month
- Included support: 2 hours/month

Monthly costs at fair use limits:
- 1,200 verifications: 1,200 × ₹0.20 = ₹240
- 1,000 SMS: 1,000 × ₹0.40 = ₹400
- 500 emails: 500 × ₹0.03 = ₹15
- OCR (ongoing): ₹60/month
- 2 hrs support/integration: ₹2,400
- Infrastructure share: ₹572/month
- S3 storage (50GB): ₹1.15/month
- Neon compute: ₹200/month
- API integration maintenance: ₹500/month
- Total monthly cost: ~₹4,388/month
- Revenue: ₹8,999/month
- Gross margin: ₹4,611 (51.2%) ✅ EXCEEDS ₹2,000 MINIMUM

OVERAGE PRICING STRUCTURE (beyond fair use limits):
- Additional verifications: ₹0.25 each (covers HF API + margin)
- Additional SMS: ₹0.50 each (covers Twilio + margin)
- Additional emails: ₹0.05 each (covers SMTP + margin)
- Additional support: ₹1,500/hour (beyond 2 hours/month)
- Overage billing: Calculated monthly, charged in next billing cycle

Example: If customer uses 2,000 verifications (800 over limit):
- Base cost: ₹4,388
- Overage: 800 × ₹0.25 = ₹200
- Total cost: ₹4,588
- Profit: ₹4,411 ✅ Still exceeds ₹2,000 minimum

ENTERPRISE TIER (Custom pricing):
One-time setup:
- White-label development: 30 hrs × ₹1,200 = ₹36,000
- Custom integrations: 20 hrs × ₹1,200 = ₹24,000
- Training/onboarding: 10 hrs × ₹1,200 = ₹12,000
- Total setup: ₹72,000
- Implementation fee: ₹1-2 lakh (separate from monthly, always include)

Monthly recurring:
- Dedicated infrastructure: ₹15,000/month
- 4 hrs support: ₹4,800/month
- Higher usage (5,000+ verifications): ₹750/month
- Custom features maintenance: ₹5,000/month
- Total monthly cost: ~₹25,550/month
- Recommended pricing: ₹50,000-75,000/month base + usage overages
- Annual contract target: ₹6-9 lakh/year + implementation fee
- Gross margin: 50-60% ✅ VERY HEALTHY

CRITICAL FINDINGS:
------------------
1. FREE TIER: Now truly free for hospitals with reduced limits (30 verifications, 1 request/month). Acceptable as customer acquisition cost if capped at 50-100 users.
2. PREMIUM TIER: Fair use limits ensure minimum ₹2,000 profit. Overage pricing protects margins on high-usage customers.
3. PILOT program: Acceptable as marketing expense if limited to 4-6 concurrent pilots.
4. ENTERPRISE tier: Strong margin potential. Always include ₹1-2 lakh implementation fee separate from monthly.

ACTION ITEMS (Priority Order):
-------------------------------
1. ✅ Update Free Tier: Remove ₹99 fee, implement limits (30 verifications, 1 request/month)
2. ✅ Define Premium fair use limits: 1,200 verifications, 1,000 SMS, 500 emails, 2 hrs support
3. ✅ Implement overage pricing: ₹0.25/verification, ₹0.50/SMS, ₹0.05/email, ₹1,500/hr support
4. Set up usage monitoring dashboard to track actual costs per customer
5. Implement automated usage caps for Free tier (hard limit at 30 verifications/month)
6. Cap Free tier users at 50-100 maximum to control acquisition cost burn
7. Budget for Pilot program: Max ₹10k/month marketing expense
8. For Enterprise: Always include implementation fee (₹1-2 lakh) separate from monthly
9. Monitor Hugging Face API usage and costs (pay-per-use, no fixed cost)
10. Monitor Neon database usage (pay-per-use model, scale as needed)