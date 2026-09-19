import app from './app.js';
import { config } from './config.js';
import { logger } from './lib/logger.js';

const port = config().PORT;
app.listen(port, () => {
  logger.info(`BORÉALE API prête sur http://localhost:${port}`, {
    env: config().NODE_ENV,
    frontend: config().FRONTEND_URL,
  });
});
