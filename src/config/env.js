import path from 'node:path';
import * as dotenv from 'dotenv';

// Only load the local dev env file outside production.
// In production (Render/Vercel/Netlify), environment variables are injected by the platform.
if (process.env.NODE_ENV !== 'production') {
  dotenv.config({ path: path.resolve('./src/config/.env.dev') });
}
