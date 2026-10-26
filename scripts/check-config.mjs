import nextEnv from '@next/env';
const { loadEnvConfig } = nextEnv;
loadEnvConfig(process.cwd());
const groups = {
  persistent: ['NEXT_PUBLIC_SUPABASE_URL', 'NEXT_PUBLIC_SUPABASE_ANON_KEY', 'SUPABASE_SERVICE_ROLE_KEY'],
  ai: ['GEMINI_API_KEY'],
  paypal: ['PAYPAL_CLIENT_ID', 'PAYPAL_CLIENT_SECRET', 'PAYPAL_MERCHANT_ID', 'PAYPAL_WEBHOOK_ID', 'NEXT_PUBLIC_APP_URL'],
};
let missing = false;
for (const [group, names] of Object.entries(groups)) {
  const absent = names.filter(name => { const value = process.env[name]; return !value || /your_|your-project-id/.test(value); });
  console.log(`${group}: ${absent.length ? `missing ${absent.join(', ')}` : 'variable names present (provider access not verified)'}`);
  if (absent.length) missing = true;
}
if (process.env.PAYPAL_API_BASE && process.env.PAYPAL_API_BASE !== 'https://api-m.sandbox.paypal.com') { console.log('PAYPAL_API_BASE must use the sandbox endpoint'); missing = true; }
process.exitCode = missing ? 1 : 0;
