import { asyncHandler } from '../lib/errors.js';
import { sourcingService } from '../services/sourcing.js';

export const sourcingController = {
  list: asyncHandler(async (_req, res) => { res.json({ data: await sourcingService.list() }); }),
  get: asyncHandler(async (req, res) => { res.json({ data: await sourcingService.get(req.params.key!) }); }),
  create: asyncHandler(async (req, res) => {
    const result = await sourcingService.upsert(req.body);
    res.status(result.created ? 201 : 200).json({ data: result });
  }),
  update: asyncHandler(async (req, res) => {
    const result = await sourcingService.upsert(req.body, req.params.key!);
    res.json({ data: result });
  }),
};
