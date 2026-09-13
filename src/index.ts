import log, { setupLogger } from './log';
import run from './runner';
import './config'; // Import to validate env vars early

setupLogger();

run()
  .then(() => process.exit(0))
  .catch((error) => {
    log(
      `Error running bastubot: ${JSON.stringify({
        error: error instanceof Error ? error.stack ?? error.message : error,
      })}`,
    );
    process.exit(1);
  });
