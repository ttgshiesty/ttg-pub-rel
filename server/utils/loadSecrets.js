/**
 * loadSecrets.js
 * Fetches secrets from AWS Secrets Manager and merges them into process.env.
 * Only runs in production. Falls back silently to existing env vars in dev.
 *
 * Secret names loaded (set AWS_SECRET_NAME in .env or EC2 instance env):
 *   - defaults to "shiesty-raiders"
 *
 * The secret value must be a JSON object, e.g.:
 * {
 *   "MONGO_URL": "...",
 *   "SESSION_SECRET": "...",
 *   "DISCORD_BOT_TOKEN": "...",
 *   ...
 * }
 */

import {
  SecretsManagerClient,
  GetSecretValueCommand,
} from '@aws-sdk/client-secrets-manager';

export async function loadSecrets() {
  if (process.env.NODE_ENV !== 'production') {
    console.log('[Secrets] Skipping AWS Secrets Manager (not production)');
    return;
  }

  const secretName = process.env.AWS_SECRET_NAME || 'shiesty-raiders';
  const preferredRegion = process.env.AWS_REGION || 'us-east-2';
  const regionsToTry = [preferredRegion, 'us-east-1', 'us-west-2'].filter(
    (r, i, arr) => arr.indexOf(r) === i,
  );

  for (const region of regionsToTry) {
    try {
      const client = new SecretsManagerClient({ region });
      const command = new GetSecretValueCommand({ SecretId: secretName });
      const response = await client.send(command);

      const secretString =
        response.SecretString ||
        (response.SecretBinary
          ? Buffer.from(response.SecretBinary, 'base64').toString('utf8')
          : null);

      if (!secretString) {
        console.warn('[Secrets] Secret value was empty — skipping merge');
        return;
      }

      const secrets = JSON.parse(secretString);
      let loaded = 0;

      for (const [key, value] of Object.entries(secrets)) {
        if (!process.env[key]) {
          process.env[key] = String(value);
          loaded++;
        }
      }

      console.log(
        `[Secrets] Loaded ${loaded} secret(s) from "${secretName}" (${region})`,
      );
      return;
    } catch (err) {
      if (
        err.message.includes("can't find") ||
        err.name === 'ResourceNotFoundException'
      ) {
        console.warn(
          `[Secrets] Secret not found in ${region}, trying next region...`,
        );
        continue;
      }
      console.error(
        '[Secrets] Failed to load from AWS Secrets Manager:',
        err.message,
      );
      console.error('[Secrets] Falling back to local environment variables');
      return;
    }
  }

  console.error(
    `[Secrets] Secret "${secretName}" not found in any region. Falling back to local environment variables.`,
  );
}
