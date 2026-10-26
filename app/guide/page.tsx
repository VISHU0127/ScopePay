import Link from 'next/link';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Getting started | ScopePay',
  description: 'A practical walkthrough from confirmed project scope to approved additional work and sandbox checkout.',
};

const steps = [
  ['Confirm your agreement', 'Create a project and paste the agreement. Compare the extracted items with the original text, edit them and confirm. Missing details stay unspecified.'],
  ['Review a new request', 'Open the project and add the client’s request. Review the suggested classification, individual request components and supporting quotations. Edit the response before sharing it.'],
  ['Agree on additional work', 'Create a proposal with deliverables, acceptance criteria and your own USD price. Preview it, then generate a client link. The client approves that exact version.'],
  ['Check the payment result', 'In a configured workspace, continue to official PayPal sandbox, approve as the sandbox buyer, return and select Verify payment status. In a private demo, use the clearly labeled simulated payment.'],
];
const questions = [
  ['Does the private demo charge money?', 'No. Demo checkout is a simulation and sends no PayPal request. Configured checkout uses PayPal sandbox test funds and one configured receiving account.'],
  ['Will my demo work be saved?', 'Only temporarily. Demo data expires after 24 hours or when the server restarts. Use sample agreements, not sensitive client documents. Sign out from the dashboard when finished.'],
  ['Can I send a demo client link to another browser?', 'Private demo links require the same browser session. For a client in another browser, use a configured persistent workspace. Expired or revoked links must be replaced by the freelancer.'],
  ['What if AI is unavailable?', 'Without a configured model, the bundled sample uses labeled fixtures. Other agreements need manual review. When a configured model fails, retry after the error; do not treat missing results as confirmed scope.'],
  ['Can I change an approved proposal?', 'Create a new version and obtain new approval. Old links are revoked. Once checkout has started, revisions are blocked until the payment outcome is resolved.'],
  ['What if checkout is cancelled or the result is unclear?', 'Return to the same proposal and check the existing payment status. Pending or unknown outcomes remain unpaid. Do not create another proposal just to retry a potentially completed charge.'],
];

export default function GuidePage() {
  return <div className="mx-auto max-w-5xl px-4 py-12 sm:px-6">
    <header className="max-w-3xl">
      <p className="text-sm font-semibold uppercase tracking-wide text-teal-700">ScopePay guide</p>
      <h1 className="mt-3 text-3xl font-bold tracking-tight text-slate-900 sm:text-5xl">A clear path from request to payment.</h1>
      <p className="mt-5 text-lg leading-relaxed text-slate-600">Review what was agreed, decide what changes, and get client approval before collecting payment. You stay in control of scope and price.</p>
      <div className="mt-6 flex flex-wrap gap-3">
        <Link href="/signin" className="rounded-lg bg-teal-700 px-5 py-3 font-semibold text-white hover:bg-teal-800">Start a private demo</Link>
        <Link href="/dashboard" className="rounded-lg border border-slate-300 bg-white px-5 py-3 font-semibold text-slate-700">Open dashboard</Link>
      </div>
    </header>
    <section aria-labelledby="walkthrough" className="mt-12">
      <h2 id="walkthrough" className="text-2xl font-bold">Your first walkthrough</h2>
      <p className="mt-2 text-slate-600">Try the sample agreement, then request “appointment booking with calendar sync.” Review the suggested response and enter your own test price.</p>
      <ol className="mt-6 grid gap-4 sm:grid-cols-2">
        {steps.map(([title, description], index) => <li key={title} className="rounded-xl border border-slate-200 bg-white p-6">
          <span className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-teal-50 font-bold text-teal-800">{index + 1}</span>
          <h3 className="mt-4 text-lg font-semibold">{title}</h3><p className="mt-2 text-sm leading-relaxed text-slate-600">{description}</p>
        </li>)}
      </ol>
    </section>
    <section aria-labelledby="answers" className="mt-12">
      <h2 id="answers" className="text-2xl font-bold">Common questions</h2>
      <div className="mt-5 space-y-3">{questions.map(([question, answer]) => <details key={question} className="rounded-xl border border-slate-200 bg-white p-5">
        <summary className="cursor-pointer font-semibold text-slate-900">{question}</summary><p className="mt-3 max-w-3xl text-sm leading-relaxed text-slate-600">{answer}</p>
      </details>)}</div>
    </section>
    <aside className="mt-10 rounded-xl border border-teal-200 bg-teal-50 p-6 text-sm leading-relaxed text-slate-700">AI suggestions require your review. A matching quotation does not guarantee the interpretation is correct. Shared-link approval records acceptance of a version; it does not verify identity.</aside>
  </div>;
}
