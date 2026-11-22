import { z } from 'zod';

const alibabaUrl = z.string().trim().max(2000).url().refine((value) => {
  const url = new URL(value);
  return url.protocol === 'https:' && !url.username && !url.password &&
    ['alibaba.com', 'alibaba.co.uk'].some((domain) => url.hostname === domain || url.hostname.endsWith(`.${domain}`));
}, 'URL HTTPS Alibaba requise.');
export const candidateKeySchema = z.string().regex(/^BOR-ALI-\d{8}-\d{2}$/);
const factsSchema = z.record(z.unknown()).superRefine((value, ctx) => {
  const pending: { value: unknown; depth: number }[] = [{ value, depth: 0 }];
  let count = 0;
  while (pending.length) {
    const node = pending.pop()!;
    if (++count > 500 || node.depth > 6) { ctx.addIssue({ code: 'custom', message: 'Faits trop complexes.' }); return; }
    if (node.value === null || typeof node.value === 'boolean') continue;
    if (typeof node.value === 'string' && node.value.length <= 4000) continue;
    if (typeof node.value === 'number' && Number.isFinite(node.value)) continue;
    if (typeof node.value !== 'object') { ctx.addIssue({ code: 'custom', message: 'Valeur JSON invalide.' }); return; }
    for (const [key, child] of Object.entries(node.value)) {
      if (key.length > 100) { ctx.addIssue({ code: 'custom', message: 'Clé trop longue.' }); return; }
      pending.push({ value: child, depth: node.depth + 1 });
    }
  }
  if (JSON.stringify(value).length > 20000) ctx.addIssue({ code: 'custom', message: 'Faits limités à 20 000 caractères.' });
});
export const sourcingCandidateSchema = z.object({
  candidateKey: candidateKeySchema,
  title: z.string().trim().min(2).max(160),
  supplierName: z.string().trim().min(2).max(200),
  supplierUrl: alibabaUrl,
  sourcePlatform: z.literal('alibaba'),
  sourceProductId: z.string().regex(/^\d{10,20}$/),
  sourceUrl: alibabaUrl,
  observedAt: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).refine((date) => {
    const parsed = new Date(date);
    return !Number.isNaN(parsed.valueOf()) && parsed.toISOString().slice(0, 10) === date;
  }, 'Date calendrier invalide.'),
  observedFacts: factsSchema,
  missingEvidence: z.array(z.string().trim().min(1).max(500)).max(40),
  notes: z.string().trim().max(5000).nullable(),
}).strict();
export type SourcingCandidateInput = z.infer<typeof sourcingCandidateSchema>;
