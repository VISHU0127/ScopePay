> Current behavior: live AI failures are surfaced as retryable errors. Detailed offline examples apply only to the exact bundled agreement. Other text receives manual-review guidance. A matching quotation does not verify the interpretation. See [developer guide](developer-guide.md) for actual verification status.

# Google AI Studio Guide for ScopePay

This guide explains how to connect and run ScopePay with **Google AI Studio** (`gemini-2.5-flash`), both inside the app and directly in the [Google AI Studio Web UI](https://aistudio.google.com/).

---

## 1. Quick Setup: Connecting ScopePay to AI Studio

### Step 1: Get Your Free API Key
1. Go to [Google AI Studio](https://aistudio.google.com/).
2. Sign in with your Google account.
3. Click **Get API key** (or visit `https://aistudio.google.com/app/apikey`).
4. Click **Create API key** and copy it.

### Step 2: Add Key to ScopePay
Open `.env.local` in your ScopePay project directory and update the `GEMINI_API_KEY` line:
```bash
GEMINI_API_KEY="AIzaSy..."
```

*(Alternatively, you can export it in your terminal)*:
```bash
export GEMINI_API_KEY="AIzaSy..."
```

### Step 3: Test Connection to AI Studio
Run the built-in AI Studio verification script:
```bash
npm run test:ai
```
This script calls `gemini-2.5-flash` through your AI Studio key, executes contract extraction and change analysis, and verifies the response format.

### Step 4: Start ScopePay
```bash
npm run dev
```
ScopePay will now run with live Google AI Studio inference! When you create projects or evaluate client change requests, live Gemini responses will be validated and cited in real time.

---

## 2. Running ScopePay Prompts Directly in Google AI Studio Web UI

If you want to test, demo, or refine ScopePay's prompts directly inside the **Google AI Studio Web Interface**:

### Prompt 1: Scope Extraction & Exclusion Identifier
1. Open [Google AI Studio](https://aistudio.google.com/) and click **New Chat** (or **New Structured Prompt**).
2. Select Model: **Gemini 2.5 Flash** (or **Gemini 1.5 Flash**).
3. Under **System Instructions**, paste:
```
You are a contract analysis specialist for freelance developers and designers.
Analyze the provided project agreement/brief and extract the agreed scope.

RULES:
1. NEVER invent absent terms. If a category is not mentioned in the agreement, return an empty array or mark it unspecified in missing_details.
2. For deliverables, exclusions, revision_limits, timelines, and acceptance_criteria, extract verbatim_quote from the agreement whenever a quote exists.
3. Identify ambiguous or missing details and list clarification questions.
4. Output strictly valid JSON.
```
4. Set **Response format**: Select **JSON**.
5. In the User Message, paste:
```
Agreement text:
"""
PROJECT AGREEMENT: ACME STUDIO WEBSITE REDESIGN
Freelancer: Alex Morgan (Morgan Digital LLC)
Client: Acme Studio (Attn: Sarah Jenkins)
Effective Date: October 1, 2026

1. PROJECT DELIVERABLES
- 5-page responsive marketing website (Home, About, Services, Case Studies, Contact).
- Custom desktop and mobile layout design following Acme Studio brand guidelines.
- Functional contact inquiry form delivering email submissions via SMTP.
- Basic on-page SEO meta tags and Google Analytics 4 integration.

2. EXPLICIT EXCLUSIONS
- Direct booking, appointment scheduling, or calendar integration functionality is strictly excluded from this phase.
- E-commerce transactions, customer checkout, and third-party payment gateways.
- Copywriting, photography, and custom video production (all assets provided by client).
- Ongoing monthly hosting or maintenance.

3. REVISIONS & FEEDBACK
- The project fee includes up to two (2) consolidated rounds of design and content revisions prior to final launch.
- Copy and typographical updates within existing page layouts are included in the revision rounds.
- Subsequent revisions or structural changes requested after round two approval will require a separate agreed change order.

4. ACCEPTANCE & TIMELINE
- Work will be delivered within four (4) weeks of initial asset handover.
- Acceptance requires written confirmation of deliverables against this scope checklist.
"""
```
6. Click **Run** (Ctrl+Enter or Cmd+Enter) to observe the structured output.

---

### Prompt 2: Scope Creep & Change Request Evaluator
1. In Google AI Studio, create a new prompt.
2. Under **System Instructions**, paste:
```
You are an expert contract scope evaluator for freelance projects.
Compare the client's new change request against the confirmed project agreement.

CRITICAL INSTRUCTIONS:
1. Classify the request as:
   - "in_scope": clearly covered by agreed deliverables or an available revision round.
   - "out_of_scope": clearly exceeds scope or involves an explicit exclusion or new functionality.
   - "ambiguous": insufficient acceptance criteria, unclear specifications, or open to conflicting interpretations.
2. For mixed requests (where parts are in-scope and parts are out-of-scope), provide sub_parts breaking down each component with its individual classification.
3. In verbatim_citations, include ONLY exact, verbatim phrases that appear word-for-word in the agreement text. Do NOT paraphrase or invent quotes.
4. Draft a polite, professional client reply explaining the situation clearly.
5. In identified_additional_work, list specific technical deliverables that would be needed if this is out of scope.
6. Return valid JSON matching the schema.
```
3. Set **Response format**: Select **JSON**.
4. In the User Message, paste:
```
Agreement Text:
"""
PROJECT AGREEMENT: ACME STUDIO WEBSITE REDESIGN
...
2. EXPLICIT EXCLUSIONS
- Direct booking, appointment scheduling, or calendar integration functionality is strictly excluded from this phase.
...
"""

Client Request:
"""
Hi Alex! We would love to add an appointment booking widget with Google Calendar sync directly on the services page.
"""
```
5. Click **Run** to see the classification, verbatim exclusion citation, identified work, and draft client reply.
