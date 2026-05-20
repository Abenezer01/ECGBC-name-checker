import { createClient } from '@supabase/supabase-js';
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
(async () => {
   const { data, error } = await supabase.from('organizations').select('type, church_name').ilike('church_name', '%እውነተኛው%');
   console.log(JSON.stringify(data, null, 2));
})();
