import { GoogleGenAI } from '@google/genai';
import { DEMO_AGREEMENT_TEXT } from '../lib/demo-agreement.ts';

const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;

if (!apiKey || apiKey === 'your_gemini_api_key_here') {
  console.error('\n❌ Error: GEMINI_API_KEY is not set in environment or .env.local.');
  console.log('To run ScopePay with live Google AI Studio:');
  console.log('1. Go to https://aistudio.google.com/app/apikey');
  console.log('2. Click "Create API key"');
  console.log('3. Run:\n   export GEMINI_API_KEY="your-api-key"\n   npm run test:ai\n');
  process.exit(1);
}

console.log('🚀 Connecting to Google AI Studio (model: gemini-2.5-flash)...');

const ai = new GoogleGenAI({ apiKey });

async function runTest() {
  try {
    console.log('\n--- 1. Testing Feature 1: Scope Extraction ---');
    const extractPrompt = `You are a contract analysis specialist for freelance developers and designers.
Analyze the following project agreement/brief and extract the agreed scope.

RULES:
1. NEVER invent absent terms.
2. For deliverables, exclusions, revision_limits, timelines, and acceptance_criteria, extract verbatim_quote from the agreement whenever a quote exists.
3. Identify ambiguous or missing details and list clarification questions.
4. Output strictly valid JSON conforming to the schema with fields: project_summary, deliverables, exclusions, revision_limits, timelines, acceptance_criteria, missing_details, clarification_questions.

Agreement text:
"""
${DEMO_AGREEMENT_TEXT}
"""`;

    const extractResponse = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: extractPrompt,
      config: {
        responseMimeType: 'application/json',
        temperature: 0.1,
      },
    });

    const extractParsed = JSON.parse(extractResponse.text);
    console.log('✅ Scope Extraction succeeded via Google AI Studio!');
    console.log(`- Project Summary: ${extractParsed.project_summary}`);
    console.log(`- Deliverables count: ${extractParsed.deliverables?.length || 0}`);
    console.log(`- Exclusions count: ${extractParsed.exclusions?.length || 0}`);

    console.log('\n--- 2. Testing Feature 2: Change-Request Analysis ---');
    const changePrompt = `You are an expert contract scope evaluator for freelance projects.
Compare the client's new change request against the confirmed project agreement.

CRITICAL INSTRUCTIONS:
1. Classify the request as: "in_scope", "out_of_scope", or "ambiguous".
2. In verbatim_citations, include ONLY exact, verbatim phrases that appear word-for-word in the agreement text.
3. Draft a polite, professional client reply explaining the situation clearly.
4. Output valid JSON with fields: classification, explanation, verbatim_citations, identified_additional_work, clarification_questions, draft_client_reply.

Agreement Text:
"""
${DEMO_AGREEMENT_TEXT}
"""

Client Request:
"""
We would love to add an appointment booking widget with Google Calendar sync directly on the services page.
"""`;

    const changeResponse = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: changePrompt,
      config: {
        responseMimeType: 'application/json',
        temperature: 0.1,
      },
    });

    const changeParsed = JSON.parse(changeResponse.text);
    console.log('✅ Change Analysis succeeded via Google AI Studio!');
    console.log(`- Classification: ${changeParsed.classification}`);
    console.log(`- Explanation: ${changeParsed.explanation}`);
    console.log(`- Verbatim Citations:`, changeParsed.verbatim_citations);
    console.log(`- Draft Reply: ${changeParsed.draft_client_reply}`);

    console.log('\n🎉 All Google AI Studio tests passed successfully!');
  } catch (err) {
    console.error('❌ Google AI Studio API call failed:', err);
    process.exit(1);
  }
}

runTest();
