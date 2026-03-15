require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
(async () => {
  const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { autoRefreshToken: false, persistSession: false } });
  const email = `probe_${Date.now()}@mail.com`;
  const { data, error } = await supabase.from('users').insert({ full_name: 'Probe User', email, password_hash: 'x', role: 'MEMBER' }).select('id, full_name, email, role').single();
  console.log(JSON.stringify({ data, error }, null, 2));
})();
