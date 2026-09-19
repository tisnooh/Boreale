/**
 * Vercel entrypoint (Root Directory = backend).
 * vercel.json rewrites every path to this function; the Express app declares
 * its own /api/* routes, so paths match 1:1 in dev and in production.
 */
import app from '../src/app.js';

export default app;
