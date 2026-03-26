import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://ayzrvzczssbkpzplldss.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImF5enJ2emN6c3Nia3B6cGxsZHNzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI2NDc2MTEsImV4cCI6MjA4ODIyMzYxMX0.B5CvovCy_p0VbN8XWxe0dfqL60T2xGAaJZo0GgqaEik'
);

async function testQuery() {
  console.log("Fetching all products...");
  const { data: products } = await supabase.from('products').select('id, sku').limit(2);
  console.log("Products:", products);

  console.log("\nFetching all warehouses...");
  const { data: w, error: we } = await supabase.from('warehouses').select('*');
  console.log("Warehouses Data:", w);
  if (we) console.log("Warehouses Error:", we);

  console.log("\nFetching all stocks...");
  const { data: s, error: se } = await supabase.from('warehouse_stocks').select('*');
  console.log("Stocks Data:", s);
  if (se) console.log("Stocks Error:", se);

  if (products && products[0]) {
      const pid = products[0].id;
      console.log(`\nTesting inner join query for product ${pid}...`);
      const { data: stockData, error: stockError } = await supabase
        .from('warehouse_stocks')
        .select(`
            quantity,
            warehouses!inner (
                id,
                name,
                is_visible
            )
        `)
        .eq('product_id', pid)
        .gt('quantity', 0);
      
      console.log("Joined data:", stockData);
      if (stockError) console.log("Joined Error:", stockError);
  }
}

testQuery().catch(console.error);
