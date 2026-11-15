import { AppError } from '../lib/errors.js';
import { sourcingRepo } from '../repositories/sourcing.js';
import { candidateKeySchema, sourcingCandidateSchema, type SourcingCandidateInput } from '../validators/sourcing.js';

function validKey(key: string) {
  const result = candidateKeySchema.safeParse(key);
  if (!result.success) throw AppError.unprocessable('invalid_candidate_key', 'Clé de candidat invalide.');
  return result.data;
}
export const sourcingService = {
  list: () => sourcingRepo.list(),
  async get(key: string) {
    const row = await sourcingRepo.get(validKey(key));
    if (!row) throw AppError.notFound('sourcing_candidate_not_found', 'Candidat introuvable.');
    return row;
  },
  async upsert(input: SourcingCandidateInput, key?: string) {
    const body = sourcingCandidateSchema.parse(input);
    if (key !== undefined && validKey(key) !== body.candidateKey) {
      throw AppError.conflict('candidate_key_immutable', 'La clé du candidat ne peut pas changer.');
    }
    // Identity and source immutability, locking and draft creation belong to the atomic RPC.
    return sourcingRepo.upsert(body);
  },
};
