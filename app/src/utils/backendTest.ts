// Utility to test backend connectivity and endpoints
import { authManager, apiClient } from '../services/api';

export async function testBackendConnectivity() {
  console.log('🔍 Testing backend connectivity...');
  
  const results = {
    auth: false,
    inspection: false,
    functions: false,
    errors: [] as string[]
  };

  try {
    // Test 1: Basic Supabase connectivity
    console.log('📡 Testing Supabase connectivity...');
    const response = await fetch('https://yqevuyyiorrdsopufeyt.supabase.co/rest/v1/', {
      headers: {
        'apikey': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlxZXZ1eXlpb3JyZHNvcHVmZXl0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTE4MzE1ODUsImV4cCI6MjA2NzQwNzU4NX0.Kjr18soW5R5yMscDZcIRZdE1moPFE89S2fBhujJ2xOY'
      }
    });
    console.log('📡 Supabase response:', response.status);
    
    // Test 2: Check if functions are deployed
    console.log('⚡ Testing Edge Functions...');
    try {
      const functionsResponse = await fetch('https://yqevuyyiorrdsopufeyt.supabase.co/functions/v1/', {
        headers: {
          'apikey': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlxZXZ1eXlpb3JyZHNvcHVmZXl0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTE4MzE1ODUsImV4cCI6MjA2NzQwNzU4NX0.Kjr18soW5R5yMscDZcIRZdE1moPFE89S2fBhujJ2xOY'
        }
      });
      console.log('⚡ Functions response:', functionsResponse.status);
      results.functions = functionsResponse.status < 500;
    } catch (error) {
      console.error('⚡ Functions test failed:', error);
      results.errors.push(`Functions: ${error}`);
    }

    // Test 3: Test specific endpoints
    const endpoints = [
      '/functions/v1/inspections',
      '/functions/v1/ai-analysis/analyze-photo',
      '/functions/v1/ai-analysis/transcribe-audio'
    ];

    for (const endpoint of endpoints) {
      try {
        console.log(`🎯 Testing ${endpoint}...`);
        const endpointResponse = await fetch(`https://yqevuyyiorrdsopufeyt.supabase.co${endpoint}`, {
          method: 'OPTIONS', // Use OPTIONS to test if endpoint exists
          headers: {
            'apikey': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlxZXZ1eXlpb3JyZHNvcHVmZXl0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTE4MzE1ODUsImV4cCI6MjA2NzQwNzU4NX0.Kjr18soW5R5yMscDZcIRZdE1moPFE89S2fBhujJ2xOY'
          }
        });
        console.log(`🎯 ${endpoint} status:`, endpointResponse.status);
        
        if (endpointResponse.status === 404) {
          results.errors.push(`Endpoint not found: ${endpoint}`);
        }
      } catch (error) {
        console.error(`🎯 ${endpoint} failed:`, error);
        results.errors.push(`${endpoint}: ${error}`);
      }
    }

    // Test 4: Try authentication
    try {
      console.log('🔐 Testing authentication...');
      const token = await authManager.getToken();
      if (token) {
        console.log('🔐 Token exists, checking validity...');
        results.auth = true;
      } else {
        console.log('🔐 No token found');
        results.errors.push('No authentication token');
      }
    } catch (error) {
      console.error('🔐 Auth test failed:', error);
      results.errors.push(`Auth: ${error}`);
    }

  } catch (error) {
    console.error('💥 Backend test failed:', error);
    results.errors.push(`General: ${error}`);
  }

  console.log('📋 Test Results:', results);
  return results;
}

export async function testCreateInspection() {
  console.log('🏠 Testing inspection creation...');
  
  try {
    const inspection = await apiClient.createInspection('Test Property Address');
    console.log('✅ Inspection created:', inspection);
    return inspection;
  } catch (error) {
    console.error('❌ Failed to create inspection:', error);
    throw error;
  }
}

export async function printDebugInfo() {
  console.log('🐛 === BACKEND DEBUG INFO ===');
  console.log('🔗 Base URL:', 'https://yqevuyyiorrdsopufeyt.supabase.co/functions/v1');
  console.log('🔑 Has Token:', !!(await authManager.getToken()));
  
  const connectivity = await testBackendConnectivity();
  
  if (connectivity.errors.length > 0) {
    console.log('❌ Issues found:');
    connectivity.errors.forEach(error => console.log('  -', error));
  } else {
    console.log('✅ All tests passed');
  }
  
  return connectivity;
}