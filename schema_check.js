import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://ayzrvzczssbkpzplldss.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImF5enJ2emN6c3Nia3B6cGxsZHNzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI2NDc2MTEsImV4cCI6MjA4ODIyMzYxMX0.B5CvovCy_p0VbN8XWxe0dfqL60T2xGAaJZo0GgqaEik'
);

async function checkSchema() {
    const { data, error } = await supabase.from('warehouses').select('*').limit(5);
    console.log("Warehouses:", data);

    const { data: p, error: pe } = await supabase.from('products').select('id, sku').limit(2);
    console.log("Products:", p);
    
    // Check if warehouse_categories exists
    const { data: wc, error: wce } = await supabase.from('warehouse_categories').select('*').limit(1);
    console.log("Categories error:", wce?.message);
}

checkSchema().catch(console.error);
