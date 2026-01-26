/**
 * Test script to verify SDK key validation
 * Run this locally: node backend/test-sdk-key.js
 */

require('dotenv').config({ path: './backend/.env' });
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL || 'https://kkgdxfencpyabcmizytn.supabase.co';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY || '';

console.log('🔍 Testing SDK Key Validation');
console.log('================================');
console.log('Supabase URL:', supabaseUrl);
console.log('Service Key Set:', supabaseServiceKey ? 'YES' : 'NO');
console.log('Is New Project:', supabaseUrl.includes('kkgdxfencpyabcmizytn'));
console.log('Is Old Project:', supabaseUrl.includes('xrvmiyrsxwrruhdljkoz'));
console.log('');

if (!supabaseServiceKey) {
  console.error('❌ SUPABASE_SERVICE_KEY not set!');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

// Test SDK key
const testSDKKey = 'ux_2ce0927ed4aa18342f1719e608cf9ce2';

console.log('Testing SDK Key:', testSDKKey);
console.log('');

supabase
  .from('projects')
  .select('id, name, sdk_key, is_active')
  .eq('sdk_key', testSDKKey)
  .single()
  .then(({ data, error }) => {
    if (error) {
      console.error('❌ Error querying database:');
      console.error('  Code:', error.code);
      console.error('  Message:', error.message);
      console.error('  Details:', error.details);
      console.error('  Hint:', error.hint);
      console.error('');
      console.error('This means:');
      if (error.code === 'PGRST116') {
        console.error('  - Project not found in database');
        console.error('  - OR backend is connecting to wrong Supabase project');
      } else if (error.message?.includes('520')) {
        console.error('  - Database connection error');
      } else {
        console.error('  - Unknown database error');
      }
      process.exit(1);
    }
    
    if (!data) {
      console.error('❌ SDK key not found in database!');
      console.error('');
      console.error('Possible causes:');
      console.error('  1. Project doesn\'t exist in this Supabase project');
      console.error('  2. Backend is connecting to wrong Supabase project');
      console.error('  3. SDK key is incorrect');
      process.exit(1);
    }
    
    console.log('✅ SDK Key Found!');
    console.log('  Project ID:', data.id);
    console.log('  Project Name:', data.name);
    console.log('  SDK Key:', data.sdk_key);
    console.log('  Is Active:', data.is_active);
    console.log('');
    console.log('✅ SDK key validation should work!');
    console.log('');
    console.log('If you\'re still getting errors:');
    console.log('  1. Make sure backend is redeployed on Vercel');
    console.log('  2. Check Vercel backend logs for connection errors');
    console.log('  3. Verify environment variables are set correctly in Vercel');
  })
  .catch((err) => {
    console.error('❌ Unexpected error:', err);
    process.exit(1);
  });
