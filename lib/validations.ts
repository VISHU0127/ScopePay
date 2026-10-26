import { z } from 'zod';

export const currencySchema = z.literal('USD');

// Dollar to cents parser/validator:
// Accepts integer cents (>= 0), or numeric dollar strings like "150.00" converted safely
export const amountCentsSchema = z
  .number()
  .int('Amount in cents must be an integer')
  .min(1, 'Amount must be at least one cent').max(100000000, 'Amount exceeds the MVP limit');

export function dollarsToCents(dollars: string | number): number {
  const value = String(dollars).trim().replace(/^\$/, '').replace(/,/g, '');
  if (!/^\d+(\.\d{1,2})?$/.test(value)) throw new Error('Enter a positive amount with at most two decimal places');
  const [whole, fraction = ''] = value.split('.');
  const cents = Number(whole) * 100 + Number(fraction.padEnd(2, '0'));
  if (!Number.isSafeInteger(cents)) throw new Error('Amount is too large');
  return cents;
}

export function centsToDollars(cents: number): string {
  return (cents / 100).toFixed(2);
}

export const createProjectSchema = z.object({
  name: z.string().min(2, 'Project name is required').max(100),
  client_name: z.string().min(2, 'Client name is required').max(100),
  client_email: z.string().email('Valid client email is required'),
  agreement_text: z.string().max(30000).min(20, 'Please provide the project agreement or scope text (at least 20 characters)'),
});

export const scopeItemSchema = z.object({
  type: z.enum(['deliverable', 'exclusion', 'revision_limit', 'timeline', 'acceptance_criteria']),
  title: z.string().trim().max(200).min(1, 'Title cannot be empty'),
  description: z.string().trim().max(10000).min(1, 'Description cannot be empty'),
  verbatim_quote: z.string().optional(),
  is_confirmed: z.boolean().default(false),
});

export const scopeExtractionResultSchema = z.object({
  project_summary: z.string().min(1),
  deliverables: z.array(scopeItemSchema),
  exclusions: z.array(scopeItemSchema),
  revision_limits: z.array(scopeItemSchema),
  timelines: z.array(scopeItemSchema),
  acceptance_criteria: z.array(scopeItemSchema),
  missing_details: z.array(z.string()),
  clarification_questions: z.array(z.string()),
});

export const confirmScopeSchema = z.object({
  project_id: z.string().uuid(),
  agreement_id: z.string().uuid(),
  items: z.array(
    z.object({
      id: z.string().optional(),
      type: z.enum(['deliverable', 'exclusion', 'revision_limit', 'timeline', 'acceptance_criteria']),
      title: z.string().trim().max(200).min(1),
      description: z.string().trim().max(10000).min(1),
      verbatim_quote: z.string().optional(),
      is_confirmed: z.boolean(),
    })
  ).min(1, 'At least one scope item must be confirmed'),
});

export const submitChangeRequestSchema = z.object({
  project_id: z.string().uuid(),
  client_request_text: z.string().max(10000).min(10, 'Request description must be at least 10 characters'),
  submitted_by_name: z.string().optional(),
  submitted_by_email: z.string().email().optional(),
});

export const subPartAnalysisSchema = z.object({
  part_text: z.string(),
  classification: z.enum(['in_scope', 'out_of_scope', 'ambiguous']),
  reasoning: z.string(),
  scope_item_title: z.string().optional(),
});

export const changeAnalysisResultSchema = z.object({
  classification: z.enum(['in_scope', 'out_of_scope', 'ambiguous']),
  explanation: z.string().min(1),
  relevant_scope_item_ids: z.array(z.string()),
  verbatim_citations: z.array(z.string()),
  identified_additional_work: z.array(z.string()),
  clarification_questions: z.array(z.string()),
  draft_client_reply: z.string().min(1),
  sub_parts: z.array(subPartAnalysisSchema).optional(),
});

export const createProposalSchema = z.object({
  project_id: z.string().uuid(),
  change_request_id: z.string().uuid(),
  title: z.string().trim().max(200).min(3, 'Title is required'),
  description: z.string().trim().max(10000).min(10, 'Description must be at least 10 characters'),
  acceptance_criteria: z.array(z.string().trim().min(1).max(1000)).max(50).min(1, 'Provide at least one acceptance criterion'),
  amount_cents: amountCentsSchema,
  currency: currencySchema.default('USD'),
});

export const clientApprovalSchema = z.object({
  proposal_id: z.string().uuid(),
  token: z.string().min(16, 'Invalid access token'),
  client_name: z.string().min(2, 'Please enter your full name to record approval'),
  client_email: z.string().email('Please enter a valid email address'),
  notes: z.string().max(500).optional(),
});

export const paypalCreateOrderSchema = z.object({
  proposal_id: z.string().uuid(),
  token: z.string().min(16),
});

export const paypalCaptureOrderSchema = z.object({
  proposal_id: z.string().uuid(),
  token: z.string().min(16),
  order_id: z.string().min(5),
});
