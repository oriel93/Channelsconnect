/**
 * Supabase Authentication Test Suite
 * Run this with: node test-auth.js
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

// Load environment variables
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
dotenv.config({ path: join(__dirname, '.env') });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;

console.log('\n🔍 Testing Supabase Authentication\n');
console.log('='.repeat(50));

// Test 1: Check Environment Variables
function testEnvironmentVariables() {
  console.log('\n📋 Test 1: Environment Variables');
  console.log('-'.repeat(50));
  
  if (!supabaseUrl) {
    console.error('❌ VITE_SUPABASE_URL is not set');
    return false;
  }
  console.log(`✅ VITE_SUPABASE_URL: ${supabaseUrl}`);
  
  if (!supabaseAnonKey) {
    console.error('❌ VITE_SUPABASE_ANON_KEY is not set');
    return false;
  }
  console.log(`✅ VITE_SUPABASE_ANON_KEY: ${supabaseAnonKey.substring(0, 20)}...`);
  
  return true;
}

// Test 2: Create Supabase Client
function testClientCreation() {
  console.log('\n🔧 Test 2: Supabase Client Creation');
  console.log('-'.repeat(50));
  
  try {
    const client = createClient(supabaseUrl, supabaseAnonKey);
    console.log('✅ Supabase client created successfully');
    return client;
  } catch (error) {
    console.error('❌ Failed to create Supabase client:', error.message);
    return null;
  }
}

// Test 3: Test Connection to Supabase
async function testConnection(client) {
  console.log('\n🌐 Test 3: Connection to Supabase');
  console.log('-'.repeat(50));
  
  try {
    // Try to get the current session (this makes a network call)
    const { data, error } = await client.auth.getSession();
    
    if (error) {
      console.error('❌ Connection failed:', error.message);
      return false;
    }
    
    console.log('✅ Successfully connected to Supabase');
    console.log(`   Session exists: ${data.session ? 'Yes' : 'No'}`);
    return true;
  } catch (error) {
    console.error('❌ Connection error:', error.message);
    
    if (error.message.includes('Failed to fetch') || error.message.includes('NetworkError')) {
      console.error('\n⚠️  Possible issues:');
      console.error('   1. Your Supabase project might be paused');
      console.error('   2. Check your internet connection');
      console.error('   3. Verify the Supabase URL is correct');
      console.error(`   4. Visit: https://app.supabase.com to check project status`);
    }
    
    return false;
  }
}

// Test 4: Test Sign Up (with test user)
async function testSignUp(client) {
  console.log('\n📝 Test 4: Sign Up Functionality');
  console.log('-'.repeat(50));
  
  const testEmail = `test-${Date.now()}@example.com`;
  const testPassword = 'TestPassword123!';
  
  console.log(`   Testing with email: ${testEmail}`);
  
  try {
    const { data, error } = await client.auth.signUp({
      email: testEmail,
      password: testPassword,
      options: {
        data: {
          full_name: 'Test User'
        }
      }
    });
    
    if (error) {
      console.error('❌ Sign up failed:', error.message);
      return { success: false, email: testEmail, password: testPassword };
    }
    
    console.log('✅ Sign up successful');
    console.log(`   User ID: ${data.user?.id || 'N/A'}`);
    console.log(`   Email: ${data.user?.email || 'N/A'}`);
    console.log(`   Confirmation required: ${data.user?.confirmed_at ? 'No' : 'Yes'}`);
    
    return { success: true, email: testEmail, password: testPassword, user: data.user };
  } catch (error) {
    console.error('❌ Sign up error:', error.message);
    return { success: false, email: testEmail, password: testPassword };
  }
}

// Test 5: Test Sign In
async function testSignIn(client, email, password) {
  console.log('\n🔐 Test 5: Sign In Functionality');
  console.log('-'.repeat(50));
  
  console.log(`   Testing with email: ${email}`);
  
  try {
    const { data, error } = await client.auth.signInWithPassword({
      email,
      password
    });
    
    if (error) {
      console.error('❌ Sign in failed:', error.message);
      
      if (error.message.includes('Email not confirmed')) {
        console.log('\n⚠️  Note: Email confirmation is required.');
        console.log('   Check your Supabase project settings:');
        console.log('   Authentication > Settings > Email Auth > Confirm email = OFF (for testing)');
      }
      
      return false;
    }
    
    console.log('✅ Sign in successful');
    console.log(`   User ID: ${data.user?.id || 'N/A'}`);
    console.log(`   Email: ${data.user?.email || 'N/A'}`);
    console.log(`   Session token: ${data.session?.access_token?.substring(0, 20) || 'N/A'}...`);
    
    return true;
  } catch (error) {
    console.error('❌ Sign in error:', error.message);
    return false;
  }
}

// Test 6: Test Get Current User
async function testGetUser(client) {
  console.log('\n👤 Test 6: Get Current User');
  console.log('-'.repeat(50));
  
  try {
    const { data: { user }, error } = await client.auth.getUser();
    
    if (error) {
      console.error('❌ Get user failed:', error.message);
      return false;
    }
    
    if (!user) {
      console.log('ℹ️  No user currently logged in');
      return true;
    }
    
    console.log('✅ Current user retrieved');
    console.log(`   User ID: ${user.id}`);
    console.log(`   Email: ${user.email}`);
    
    return true;
  } catch (error) {
    console.error('❌ Get user error:', error.message);
    return false;
  }
}

// Test 7: Test Sign Out
async function testSignOut(client) {
  console.log('\n🚪 Test 7: Sign Out Functionality');
  console.log('-'.repeat(50));
  
  try {
    const { error } = await client.auth.signOut();
    
    if (error) {
      console.error('❌ Sign out failed:', error.message);
      return false;
    }
    
    console.log('✅ Sign out successful');
    return true;
  } catch (error) {
    console.error('❌ Sign out error:', error.message);
    return false;
  }
}

// Run all tests
async function runAllTests() {
  console.log('\n🚀 Starting Supabase Authentication Tests...\n');
  
  const results = {
    total: 7,
    passed: 0,
    failed: 0
  };
  
  // Test 1: Environment Variables
  if (testEnvironmentVariables()) {
    results.passed++;
  } else {
    results.failed++;
    console.log('\n❌ Critical failure: Environment variables not set properly');
    printSummary(results);
    process.exit(1);
  }
  
  // Test 2: Client Creation
  const client = testClientCreation();
  if (client) {
    results.passed++;
  } else {
    results.failed++;
    console.log('\n❌ Critical failure: Cannot create Supabase client');
    printSummary(results);
    process.exit(1);
  }
  
  // Test 3: Connection
  if (await testConnection(client)) {
    results.passed++;
  } else {
    results.failed++;
    console.log('\n❌ Critical failure: Cannot connect to Supabase');
    printSummary(results);
    process.exit(1);
  }
  
  // Test 4: Sign Up
  const signUpResult = await testSignUp(client);
  if (signUpResult.success) {
    results.passed++;
  } else {
    results.failed++;
  }
  
  // Wait a bit for the signup to process
  await new Promise(resolve => setTimeout(resolve, 1000));
  
  // Test 5: Sign In
  if (await testSignIn(client, signUpResult.email, signUpResult.password)) {
    results.passed++;
  } else {
    results.failed++;
  }
  
  // Test 6: Get User
  if (await testGetUser(client)) {
    results.passed++;
  } else {
    results.failed++;
  }
  
  // Test 7: Sign Out
  if (await testSignOut(client)) {
    results.passed++;
  } else {
    results.failed++;
  }
  
  printSummary(results);
}

function printSummary(results) {
  console.log('\n' + '='.repeat(50));
  console.log('📊 TEST SUMMARY');
  console.log('='.repeat(50));
  console.log(`Total Tests: ${results.total}`);
  console.log(`✅ Passed: ${results.passed}`);
  console.log(`❌ Failed: ${results.failed}`);
  console.log(`Success Rate: ${((results.passed / results.total) * 100).toFixed(1)}%`);
  console.log('='.repeat(50) + '\n');
  
  if (results.failed === 0) {
    console.log('🎉 All tests passed! Your Supabase authentication is working correctly.\n');
  } else {
    console.log('⚠️  Some tests failed. Please check the errors above.\n');
  }
}

// Run the tests
runAllTests().catch(error => {
  console.error('\n💥 Unexpected error:', error);
  process.exit(1);
});

