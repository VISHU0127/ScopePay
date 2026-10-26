import type { Metadata } from 'next';
import './globals.css';
import Link from 'next/link';
import { ShieldCheck, ArrowRight } from 'lucide-react';

export const metadata: Metadata = {
  title: 'ScopePay | Clear scope. Approved changes. Confident payments.',
  description: 'Helping freelancers detect scope creep, agree on additional work with clients, and collect payments through PayPal.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="h-full">
      <body className="min-h-full flex flex-col bg-slate-50 text-slate-900 antialiased selection:bg-teal-100 selection:text-teal-900">
        <a href="#main" className="skip-link">Skip to content</a>
        <header className="sticky top-0 z-40 w-full border-b border-slate-200 bg-white">
          <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
            <div className="flex items-center gap-6">
              <Link href="/" className="flex items-center gap-2 group">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-teal-700 text-white shadow-sm transition-transform group-hover:scale-105">
                  <ShieldCheck className="h-5 w-5" />
                </div>
                <div className="flex flex-col">
                  <span className="font-bold text-lg leading-tight tracking-tight text-slate-900">
                    Scope<span className="text-teal-700">Pay</span>
                  </span>
                  <span className="hidden sm:block text-[10px] uppercase font-semibold tracking-wider text-slate-500">
                    Freelance Scope &amp; Payments
                  </span>
                </div>
              </Link>
            </div>

            <nav aria-label="Main navigation" className="flex items-center gap-1 sm:gap-4">
              <Link
                href="/dashboard"
                className="whitespace-nowrap text-sm font-medium text-slate-700 hover:text-teal-700 transition-colors px-2 py-2 rounded-md hover:bg-slate-100"
              >
                Dashboard
              </Link>
              <Link
                href="/projects/new"
                className="hidden sm:inline-flex text-sm font-medium text-slate-700 hover:text-teal-700 transition-colors px-3 py-2 rounded-md hover:bg-slate-100"
              >
                + New Project
              </Link>
              <Link
                href="/signin"
                className="whitespace-nowrap text-sm font-medium text-slate-700 hover:text-teal-700 transition-colors px-2 py-2 rounded-md hover:bg-slate-100"
              >
                Sign In
              </Link>
              <Link
                href="/dashboard"
                className="hidden md:inline-flex items-center gap-1.5 rounded-lg bg-teal-700 px-3.5 py-2 text-sm font-semibold text-white shadow-sm hover:bg-teal-700 focus-visible:outline-2 focus-visible:outline-teal-600 transition"
              >
                <span>Open Workspace</span>
                <ArrowRight className="h-4 w-4" />
              </Link>
            </nav>
          </div>
        </header>

        <main id="main" tabIndex={-1} className="flex-1">{children}</main>

        <footer className="border-t border-slate-200 bg-white py-8 text-xs text-slate-500">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <span className="font-semibold text-slate-700">ScopePay</span>
              <span>&bull;</span>
              <span>“Clear scope. Approved changes. Confident payments.”</span>
            </div>
            <Link href="/guide" className="font-semibold text-teal-700 underline">Help &amp; guide</Link>
            <p className="max-w-lg text-center sm:text-right text-slate-500">
              ScopePay supports agreements and payments. It does not provide legal decisions, escrow, arbitration, or automatic dispute resolution. PayPal Sandbox mode only.
            </p>
          </div>
        </footer>
      </body>
    </html>
  );
}
