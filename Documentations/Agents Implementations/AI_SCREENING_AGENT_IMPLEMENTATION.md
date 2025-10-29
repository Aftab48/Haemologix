# AI Screening Agent - Implementation Complete

## Overview

The AI Screening Agent has been successfully implemented as a full-fledged autonomous agent that performs two-stage verification:

1. **Document Verification** (OCR matching with 80% fuzzy threshold) - Allows 3 retries
2. **Eligibility Screening** (Donor criteria checking) - Immediate 14-day suspension if failed

## What's Been Implemented

### 1. Database Schema Updates (`prisma/schema.prisma`)

**DonorVerification Model - New Fields:**
- `eligibilityChecked: Boolean` - Tracks if eligibility was checked
- `eligibilityPassed: Boolean` - Result of eligibility check
- `failedCriteria: Json` - Stores detailed failure reasons

**AgentType Enum - New Value:**
- `VERIFICATION` - Added to the agent types

### 2. Verification Agent (`lib/agents/verificationAgent.ts`)

**Core Functions:**

- `checkDonorEligibility()` - Checks all eligibility criteria:
  - ✅ **Age**: 18-65 years
  - ✅ **Weight**: Minimum 50 kg
  - ✅ **BMI**: Minimum 18.5
  - ✅ **Hemoglobin**: Minimum 12.5 g/dL
  - ✅ **Disease Tests**: All negative (HIV, Hepatitis B, Hepatitis C, Syphilis, Malaria)
  - ✅ **Donation Interval**: 3 months (male) / 4 months (female) since last donation

- `processDonorVerification()` - Main verification orchestrator:
  - Publishes events to AgentEvent table
  - Logs decisions to AgentDecision table
  - Returns detailed pass/fail information

- `getVerificationStats()` - Dashboard statistics:
  - Total verifications
  - Document failures
  - Eligibility failures
  - Common failure criteria

### 3. Updated Verification Actions (`lib/actions/verification.actions.ts`)

**Enhanced `handleVerificationResult()`:**
- Two-stage verification workflow
- Document failure → 3 retries allowed, 14-day suspension after 3 failures
- Eligibility failure → Immediate 14-day suspension, NO retries
- Integrates with verification agent for event publishing and decision logging

### 4. Email System (`lib/actions/mails.actions.ts`)

**New Email Function:**
- `sendEligibilityRejectionEmail()` - Detailed eligibility failure email
  - Lists each failed criterion with actual vs required values
  - Explains why each criterion failed
  - Shows 14-day suspension period and reapplication date

**Updated Email Functions:**
- `sendApplicationRejectedEmail()` - Now accepts mismatch details for document failures
- `sendAccountSuspensionEmail()` - Updated to 14-day suspension with detailed reasons

### 5. Email Template (`public/emails/eligibilityRejection.html`)

Beautiful, professional email template showing:
- Personalized greeting
- Detailed failed criteria breakdown
- Visual criteria cards with your value vs required value
- 14-day suspension notice
- Reapplication date
- Clear next steps
- Professional branding

### 6. API Endpoint (`app/api/agents/verification/route.ts`)

**POST `/api/agents/verification`:**
- Manually trigger verification for a donor
- Used for admin retry functionality or webhook integration

**GET `/api/agents/verification`:**
- Fetch verification statistics for dashboard

### 7. Dashboard Integration (`components/AgenticDashboard.tsx`)

**Added VERIFICATION Agent:**
- Pink theme (from-pink-500 to-pink-700)
- CheckCircle2 icon
- Real-time statistics tracking
- Integration with existing 5 agents

### 8. Agent Logs (`components/AIAgentLogs.tsx`)

**Enhanced Filtering:**
- VERIFICATION filter option added
- Pink color scheme for verification logs
- Shows document and eligibility decision logs
- Displays confidence scores and reasoning

## Verification Flow

### Stage 1: Document Verification (OCR)

```
Donor Submits → OCR Extraction → Fuzzy Matching (80%) → Compare Fields
                                                             ↓
                                                     ✅ Pass → Stage 2
                                                             ↓
                                                     ❌ Fail → Retry (up to 3 times)
                                                             ↓
                                                     3 Fails → 14-day suspension
```

### Stage 2: Eligibility Screening

```
Documents Passed → Check All Criteria → All Pass ✅ → Mark as PENDING for Admin
                                            ↓
                                     Any Fail ❌ → Immediate 14-day suspension
                                            ↓                     ↓
                                     NO RETRIES            Detailed email sent
```

## Key Differences: Document vs Eligibility Failures

| Aspect | Document Failure | Eligibility Failure |
|--------|-----------------|-------------------|
| **Retries** | 3 attempts allowed | NO retries |
| **Suspension** | After 3 failures → 14 days | Immediate → 14 days |
| **Email** | Document mismatch details | Failed criteria breakdown |
| **Reason** | OCR extraction issues | Does not meet medical criteria |
| **Can Fix** | Upload better documents | Need to improve health metrics |

## Testing Guide

### Step 1: Run Database Migration

```bash
npx prisma migrate dev --name add_verification_agent
npx prisma generate
```

### Step 2: Test Document Verification Failure

1. Register as a donor with valid criteria
2. Upload documents that don't match (wrong name on ID)
3. **Expected:** Rejection email, can retry (attempt 1/3)
4. Retry 2 more times
5. **Expected:** 14-day suspension email after 3rd failure

### Step 3: Test Eligibility Failure

1. Register as a donor with **invalid criteria**:
   - Age: 17 years (too young)
   - Hemoglobin: 11.0 g/dL (too low)
   - Weight: 45 kg (too low)

2. Upload valid documents (matching your data)
3. **Expected:**
   - Documents pass ✅
   - Eligibility fails ❌
   - Immediate 14-day suspension
   - Detailed email with:
     - Age: 17 years, Required: 18-65 years
     - Hemoglobin: 11.0 g/dL, Required: Minimum 12.5 g/dL
     - Weight: 45 kg, Required: Minimum 50 kg

### Step 4: Test Successful Verification

1. Register with all valid criteria:
   - Age: 25 years ✅
   - Weight: 65 kg ✅
   - BMI: 22.5 ✅
   - Hemoglobin: 14.0 g/dL ✅
   - All disease tests: Negative ✅

2. Upload matching documents
3. **Expected:**
   - Documents pass ✅
   - Eligibility pass ✅
   - Status: PENDING (awaiting admin approval)
   - Confirmation email sent

### Step 5: Monitor Agent Dashboard

1. Go to Admin Panel → Agentic Dashboard
2. **Expected to see:**
   - VERIFICATION agent card (pink theme)
   - Total verifications count
   - Success/failure rates
   - Real-time activity feed

### Step 6: Check Agent Logs

1. Go to Admin Panel → AI Agent Logs
2. Filter by "Verification"
3. **Expected to see:**
   - Document verification attempts
   - Eligibility check results
   - Failed criteria details
   - Decision reasoning

## API Testing

### Manual Verification Trigger

```bash
curl -X POST http://localhost:3000/api/agents/verification \
  -H "Content-Type: application/json" \
  -d '{
    "donorId": "your-donor-id",
    "documentVerificationResults": {
      "allPassed": true,
      "hasTechnicalError": false,
      "mismatches": []
    }
  }'
```

### Get Verification Stats

```bash
curl http://localhost:3000/api/agents/verification
```

**Response:**
```json
{
  "success": true,
  "stats": {
    "total": 50,
    "documentFailed": 10,
    "eligibilityFailed": 5,
    "passed": 35,
    "commonFailures": [
      { "criterion": "Hemoglobin", "count": 3 },
      { "criterion": "Age", "count": 2 }
    ]
  }
}
```

## File Structure

```
lib/agents/
  └── verificationAgent.ts          # NEW: Core agent logic

lib/actions/
  ├── verification.actions.ts       # UPDATED: Integration with agent
  └── mails.actions.ts              # UPDATED: New email functions

app/api/agents/
  └── verification/
      └── route.ts                  # NEW: API endpoints

public/emails/
  └── eligibilityRejection.html     # NEW: Email template

components/
  ├── AgenticDashboard.tsx          # UPDATED: Added VERIFICATION
  └── AIAgentLogs.tsx               # UPDATED: Added VERIFICATION

prisma/
  └── schema.prisma                 # UPDATED: New fields + enum
```

## Agent System Integration

The Verification Agent is now fully integrated with the existing agent ecosystem:

✅ **Event Bus** - Publishes events to AgentEvent table
✅ **Decision Logging** - Logs all decisions to AgentDecision table
✅ **Workflow Tracking** - Compatible with WorkflowState
✅ **Dashboard Monitoring** - Real-time statistics and activity
✅ **Agent Logs** - Filterable detailed decision logs

## Eligibility Criteria Summary

Based on `DonorRegistration` model and registration page:

| Criterion | Requirement | Checked From |
|-----------|-------------|--------------|
| **Age** | 18-65 years | `dateOfBirth` |
| **Weight** | ≥ 50 kg | `weight` |
| **BMI** | ≥ 18.5 | `bmi` (calculated) |
| **Hemoglobin** | ≥ 12.5 g/dL | `hemoglobin` |
| **HIV Test** | Negative | `hivTest` |
| **Hepatitis B** | Negative | `hepatitisBTest` |
| **Hepatitis C** | Negative | `hepatitisCTest` |
| **Syphilis** | Negative | `syphilisTest` |
| **Malaria** | Negative | `malariaTest` |
| **Donation Gap** | Male: 3 months<br>Female: 4 months | `lastDonation` + `gender` |

## Important Notes

1. **14-Day Suspension**: Changed from 7 days to 14 days for both document and eligibility failures
2. **No Retries for Eligibility**: Unlike document failures, eligibility failures result in immediate suspension
3. **Fuzzy Matching**: 80% threshold maintained for document verification
4. **Event Publishing**: All verification activities are tracked in AgentEvent for audit trail
5. **Detailed Emails**: Recipients get clear, actionable feedback on what went wrong

## Next Steps

1. ✅ Run `npx prisma migrate dev` to apply schema changes
2. ✅ Run `npx prisma generate` to update Prisma client
3. ✅ Test with sample donors (various failure scenarios)
4. ✅ Monitor Agent Dashboard for real-time verification activities
5. ✅ Review Agent Logs to ensure proper decision logging
6. ✅ Verify emails are being sent correctly

## Success Indicators

✅ Verification Agent appears in dashboard with pink theme
✅ Agent logs show verification decisions with detailed reasoning
✅ Document failures allow 3 retries before suspension
✅ Eligibility failures result in immediate 14-day suspension
✅ Emails contain detailed failure criteria
✅ All verifications are tracked in AgentEvent and AgentDecision tables

---

**Implementation Status**: ✅ COMPLETE

All planned features have been implemented and integrated with the existing agent system.

