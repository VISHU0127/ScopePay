'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import SignOutButton from '@/app/components/sign-out-button';
import { centsToDollars } from '@/lib/validations';
import {
  ArrowRight,
  PlusCircle,
} from 'lucide-react';
import { Project, ChangeProposal, Freelancer } from '@/lib/types';

export default function DashboardPage() {
  const [freelancer, setFreelancer] = useState<Freelancer | null>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const [proposals, setProposals] = useState<ChangeProposal[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [metrics, setMetrics] = useState({ proposed: 0, approvedUnpaid: 0, paid: 0 });
  const [loading, setLoading] = useState(true);

  function loadData() {

    fetch('/api/projects')
      .then(async (res) => { if (!res.ok) throw new Error(res.status === 401 ? 'Sign in or start a private demo to open your workspace.' : 'Could not load your workspace.'); return res.json(); })
      .then((data) => {
        if (data.projects) {
          setFreelancer(data.freelancer);
          setMetrics(data.metrics);
          setProjects(data.projects);
          setProposals(data.outstandingProposals || []);
        }
      })
      .catch(error => setError(error.message))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    loadData();
  }, []);

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8 sm:py-10">
      {/* Top Banner & Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-6 mb-8">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
              Freelancer Dashboard
            </h1>
            <span className="inline-flex items-center rounded-full bg-teal-50 px-2.5 py-0.5 text-xs font-semibold text-teal-800 border border-teal-200">
              {freelancer?.name || 'Workspace'}
            </span>
          </div>
          <p className="mt-1 text-sm text-slate-500">
            Track confirmed scopes, evaluate scope creep, and collect payment for approved additions.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {freelancer && <SignOutButton />} 
          <Link
            href="/projects/new"
            className="inline-flex items-center gap-1.5 rounded-lg bg-teal-700 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-teal-700 transition"
          >
            <PlusCircle className="h-4 w-4" />
            <span>New Project</span>
          </Link>
        </div>
      </div>

      {error && <div role="alert" className="mb-6 rounded-xl border border-amber-200 bg-amber-50 p-5 text-sm text-amber-900">{error} <Link href="/signin" className="font-semibold underline">Sign in</Link> <button onClick={() => { setLoading(true); setError(null); loadData(); }} className="ml-4 underline">Retry</button></div>}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3 mb-8" aria-busy={loading}>
        {[['Proposed', metrics.proposed, 'Draft and sent versions awaiting approval'], ['Approved · unpaid', metrics.approvedUnpaid, 'Approved work without completed payment'], ['Completed payments', metrics.paid, 'Sandbox or demo totals; refunds excluded']].map(([label, amount, description]) => <div key={label} className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm"><p className="text-sm font-semibold text-slate-600">{label}</p><p className="mt-2 text-3xl font-bold tracking-tight text-slate-900">{loading ? '—' : `$${centsToDollars(Number(amount))}`} <span className="text-xs font-medium text-slate-500">USD</span></p><p className="mt-2 text-xs text-slate-500">{description}</p></div>)}
      </div>
      <p className="mb-6 text-sm text-slate-600">{projects.filter(p => p.status === 'active').length} active projects · One configured sandbox receiver. Demo payments are simulations.</p>

      {!loading && !error && <aside className="mb-8 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-teal-200 bg-teal-50 p-5">
        <div><h2 className="font-semibold text-slate-900">From agreement to approved work</h2><p className="mt-1 text-sm text-slate-700">Confirm scope, review a request, then agree terms before checkout.</p></div>
        <Link href="/guide" className="text-sm font-semibold text-teal-800 underline">Follow the walkthrough</Link>
      </aside>}
      {/* Outstanding Change Proposals Section */}
      <div className="mb-10">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
            <span>Outstanding Change Proposals</span>
            <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-600 font-medium">
              {proposals.length}
            </span>
          </h2>
        </div>

        {loading ? (
          <div className="rounded-xl border border-slate-200 bg-white p-8 text-center text-sm text-slate-500">
            Loading proposals...
          </div>
        ) : proposals.length === 0 ? (
          <div className="rounded-xl border border-dashed border-slate-300 bg-white p-8 text-center">
            <p className="text-sm text-slate-500">No outstanding change proposals at this time.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {proposals.map((proposal) => {
              const project = projects.find((p) => p.id === proposal.project_id);
              const isApproved = proposal.approval_status === 'approved';
              const isPaid = proposal.payment_status === 'paid';

              return (
                <div
                  key={proposal.id}
                  className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm hover:border-slate-300 transition"
                >
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <div>
                      <span className="text-xs font-medium text-slate-500">
                        {project?.name || 'Project'} &bull; v{proposal.version}
                      </span>
                      <h3 className="text-base font-bold text-slate-900 mt-0.5">
                        {proposal.title}
                      </h3>
                    </div>
                    <span className="text-lg font-extrabold text-slate-900">
                      ${centsToDollars(proposal.amount_cents)}
                    </span>
                  </div>

                  <p className="text-xs text-slate-600 line-clamp-2 mb-4">
                    {proposal.description}
                  </p>

                  <div className="flex flex-wrap gap-3 items-center justify-between border-t border-slate-100 pt-3">
                    <div className="flex flex-wrap items-center gap-2">
                      <span
                        className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                          isApproved
                            ? 'bg-teal-50 text-teal-800 border border-teal-200'
                            : 'bg-amber-50 text-amber-800 border border-amber-200'
                        }`}
                      >
                        Approval: {proposal.approval_status}
                      </span>
                      <span
                        className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                          isPaid
                            ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                            : 'bg-slate-100 text-slate-700'
                        }`}
                      >
                        Payment: {proposal.payment_status}
                      </span>
                    </div>

                    <Link
                      href={`/projects/${proposal.project_id}`}
                      className="inline-flex items-center gap-1 text-xs font-semibold text-teal-700 hover:text-teal-800"
                    >
                      <span>View in Project</span>
                      <ArrowRight className="h-3.5 w-3.5" />
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Projects List Section */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-slate-900">Your Projects</h2>
        </div>

        {projects.length === 0 && !loading ? (
          <div className="rounded-xl border border-dashed border-slate-300 bg-white p-12 text-center">
            <h3 className="text-base font-semibold text-slate-900">No projects created yet</h3>
            <p className="mt-1 text-sm text-slate-500">
              Create your first project and paste an agreement to extract confirmed scope.
            </p>
            <div className="mt-6">
              <Link
                href="/projects/new"
                className="inline-flex items-center gap-2 rounded-lg bg-teal-700 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-teal-700"
              >
                <PlusCircle className="h-4 w-4" />
                <span>Create Project</span>
              </Link>
            </div>
          </div>
        ) : (
          <div className="divide-y divide-slate-200 rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
            {projects.map((project) => (
              <div
                key={project.id}
                className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-slate-50 transition"
              >
                <div>
                  <div className="flex items-center gap-3">
                    <h3 className="text-base font-bold text-slate-900">
                      <Link href={`/projects/${project.id}`} className="hover:text-teal-700">
                        {project.name}
                      </Link>
                    </h3>
                    <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-600 font-medium capitalize">
                      {project.status}
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-slate-500">
                    Client: <span className="font-medium text-slate-700">{project.client_name}</span> ({project.client_email})
                  </p>
                </div>

                <div className="flex items-center gap-3">
                  <Link
                    href={`/projects/${project.id}`}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3.5 py-1.5 text-xs font-semibold text-slate-700 shadow-sm hover:bg-slate-50 transition"
                  >
                    <span>Open Project Detail</span>
                    <ArrowRight className="h-3.5 w-3.5 text-slate-500" />
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
