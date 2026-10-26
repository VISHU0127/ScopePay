import Link from 'next/link';
import {
  Sparkles,
  CheckCircle2,
  CreditCard,
  ArrowRight,
  Scale,
  Lock,
} from 'lucide-react';

export default function LandingPage() {
  return (
    <div className="flex flex-col min-h-screen">
      {/* Hero Section */}
      <section className="relative overflow-hidden border-b border-slate-200 bg-white py-16 sm:py-24">
        <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 text-center">
          <div className="inline-flex items-center gap-2 rounded-full bg-teal-50 px-3.5 py-1.5 text-xs font-semibold text-teal-800 border border-teal-200 mb-6">
            <span className="flex h-2 w-2 rounded-full bg-teal-700 animate-pulse" />
            Hackathon MVP &bull; PayPal Sandbox &bull; Grounded AI Analysis
          </div>

          <h1 className="text-4xl sm:text-6xl font-extrabold tracking-tight text-slate-900 leading-tight">
            Clear scope. Approved changes. <br className="hidden sm:inline" />
            <span className="text-teal-700">Confident payments.</span>
          </h1>

          <p className="mx-auto mt-6 max-w-2xl text-lg sm:text-xl text-slate-600 leading-relaxed">
            Stop giving away unbilled hours to scope creep. ScopePay compares incoming client requests against your original project agreement, extracts evidence-backed boundaries, and collects payments via PayPal before extra work begins.
          </p>

          <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
            <Link
              href="/signin"
              className="inline-flex items-center gap-2 rounded-lg bg-teal-700 px-6 py-3.5 text-base font-semibold text-white shadow-sm hover:bg-teal-700 transition"
            >
              <span>Try Interactive Demo</span>
              <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              href="/signin"
              className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-6 py-3.5 text-base font-semibold text-slate-700 hover:bg-slate-50 transition"
            >
              Freelancer Sign In
            </Link>
          </div>

          <p className="mt-5 text-sm text-slate-600"><Link href="/guide" className="font-semibold text-teal-700 underline">See how ScopePay works</Link> · Private demos simulate checkout; configured workspaces use PayPal sandbox.</p>

          <div className="mt-6 flex flex-wrap items-center justify-center gap-4 text-xs text-slate-500">
            <span className="flex items-center gap-1.5">
              <CheckCircle2 className="h-4 w-4 text-teal-700" /> Pre-loaded Acme Studio demo
            </span>
            <span className="flex items-center gap-1.5">
              <CheckCircle2 className="h-4 w-4 text-teal-700" /> No account needed · simulated payments
            </span>
          </div>
        </div>
      </section>

      {/* Core Workflow Section */}
      <section className="py-16 sm:py-20 bg-slate-50 border-b border-slate-200">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-12">
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900">
              The 4-Step ScopePay Workflow
            </h2>
            <p className="mt-3 text-slate-600 text-sm sm:text-base">
              A transparent, grounded system that protects both freelancer revenue and client trust.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm relative">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-teal-50 text-teal-700 font-bold mb-4">
                1
              </div>
              <h3 className="text-base font-bold text-slate-900 mb-2">Confirmed Scope</h3>
              <p className="text-sm text-slate-600 leading-normal">
                Paste your original agreement. AI extracts deliverables, exclusions, and revision limits. You review, edit, and confirm.
              </p>
            </div>

            <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm relative">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-teal-50 text-teal-700 font-bold mb-4">
                2
              </div>
              <h3 className="text-base font-bold text-slate-900 mb-2">Request Analysis</h3>
              <p className="text-sm text-slate-600 leading-normal">
                When the client sends a new request, AI evaluates it against confirmed scope and validates verbatim citations in the contract text.
              </p>
            </div>

            <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm relative">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-teal-50 text-teal-700 font-bold mb-4">
                3
              </div>
              <h3 className="text-base font-bold text-slate-900 mb-2">Approved Proposal</h3>
              <p className="text-sm text-slate-600 leading-normal">
                Set your price ($) and criteria. The client reviews via an expiring token link and records their approval on the exact version.
              </p>
            </div>

            <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm relative">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-teal-50 text-teal-700 font-bold mb-4">
                4
              </div>
              <h3 className="text-base font-bold text-slate-900 mb-2">PayPal Payment</h3>
              <p className="text-sm text-slate-600 leading-normal">
                Client pays through PayPal Sandbox. Server captures and verifies order amount, updating your dashboard after server verification. Approved proposal terms stay frozen.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Feature Deep Dive */}
      <section className="py-16 bg-white border-b border-slate-200">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="p-6 rounded-xl border border-slate-200 bg-slate-50/50">
              <div className="h-10 w-10 rounded-lg bg-teal-700 text-white flex items-center justify-center mb-4">
                <Sparkles className="h-5 w-5" />
              </div>
              <h3 className="text-lg font-bold text-slate-900 mb-2">Grounded Citation Verification</h3>
              <p className="text-sm text-slate-600 leading-relaxed">
                ScopePay checks quotations against the source agreement. Review the interpretation yourself before confirming scope or sending a proposal.
              </p>
            </div>

            <div className="p-6 rounded-xl border border-slate-200 bg-slate-50/50">
              <div className="h-10 w-10 rounded-lg bg-teal-700 text-white flex items-center justify-center mb-4">
                <Lock className="h-5 w-5" />
              </div>
              <h3 className="text-lg font-bold text-slate-900 mb-2">Versioned &amp; Frozen Proposals</h3>
              <p className="text-sm text-slate-600 leading-relaxed">
                Once a client approves a proposal, its text, price, and scope are permanently frozen. Any subsequent revisions automatically create a new version requiring re-approval.
              </p>
            </div>

            <div className="p-6 rounded-xl border border-slate-200 bg-slate-50/50">
              <div className="h-10 w-10 rounded-lg bg-teal-700 text-white flex items-center justify-center mb-4">
                <CreditCard className="h-5 w-5" />
              </div>
              <h3 className="text-lg font-bold text-slate-900 mb-2">Server-Side PayPal Orders</h3>
              <p className="text-sm text-slate-600 leading-relaxed">
                Browser prices are never trusted. The backend verifies the PayPal capture against the exact approved proposal amount and custom ID.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Disclaimers & Limitations */}
      <section className="py-12 bg-slate-100">
        <div className="mx-auto max-w-4xl px-4 text-center">
          <div className="inline-flex items-center gap-2 text-slate-600 font-medium text-xs mb-3">
            <Scale className="h-4 w-4 text-slate-500" /> Scope &amp; Legal Boundary Notice
          </div>
          <p className="text-xs text-slate-600 leading-relaxed">
            ScopePay supports agreements and payments. It does not provide legal decisions, escrow, arbitration, or automatic dispute resolution. Client approvals recorded via access links confirm client acceptance of proposal terms, but do not constitute a certified electronic signature or legal identity verification. For this hackathon MVP, payments run on the PayPal Sandbox environment into a single configured sandbox merchant account.
          </p>
        </div>
      </section>
    </div>
  );
}
