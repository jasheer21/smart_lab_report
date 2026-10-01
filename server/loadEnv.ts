import dotenv from 'dotenv';

// Must be imported before ./config. Earlier files win, so .env.local overrides .env.
dotenv.config({ path: ['.env.local', '.env'], quiet: true });
