import log from './log';
import run from './runner';
import { sendErrorLog } from './emailSender';
import './config'; // Import to validate env vars early

run()
  .then(() => process.exit(0))
  .catch(async (error) => {
    log(
      `Error running bastubot: ${JSON.stringify({
        error: error instanceof Error ? error.stack ?? error.message : error,
      })}`,
    );

    try {
      await sendErrorLog();
    } catch (emailError) {
      log(`Failed to send failure alert email: ${emailError}`);
    }

    process.exit(1);
  });
