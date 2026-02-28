import { createClient } from '@supabase/supabase-js';

const supabaseUrl = "https://vxtfhwetkupfufeusxws.supabase.co";
const supabaseKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZ4dGZod2V0a3VwZnVmZXVzeHdzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzA1OTQxNDIsImV4cCI6MjA4NjE3MDE0Mn0.N-cYYh5Xk1NX75d_YNmRRxkDGhsw-578nGwZekw0cUI";

const supabase = createClient(supabaseUrl, supabaseKey);

async function clearSchedules() {
    const { data, error } = await supabase.from('planning_schedule').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    if (error) {
        console.error("Error wiping schedules:", error);
    } else {
        console.log("Successfully wiped planning_schedule");
    }
}

clearSchedules();
