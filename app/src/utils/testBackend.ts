// Simple test to debug the exact URL structure issue
import { authManager } from '../services/api';

const BASE_URL = 'https://yqevuyyiorrdsopufeyt.supabase.co/functions/v1';

export async function testInspectionItemsEndpoint() {
  console.log('🧪 Testing inspection-items endpoint...');
  
  const token = await authManager.getToken();
  if (!token) {
    console.log('❌ No token available');
    return;
  }

  // Test 1: Simple GET to see if function responds at all
  console.log('🧪 Test 1: Basic function call');
  try {
    const response1 = await fetch(`${BASE_URL}/inspection-items`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'apikey': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlxZXZ1eXlpb3JyZHNvcHVmZXl0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTE4MzE1ODUsImV4cCI6MjA2NzQwNzU4NX0.Kjr18soW5R5yMscDZcIRZdE1moPFE89S2fBhujJ2xOY'
      }
    });
    console.log('📊 Basic function response:', response1.status);
    const text1 = await response1.text();
    console.log('📄 Basic function body:', text1);
  } catch (error) {
    console.error('❌ Basic function test failed:', error);
  }

  // Test 2: Test with inspection path
  const testInspectionId = 'test-id-123';
  const testUrl = `${BASE_URL}/inspection-items/inspections/${testInspectionId}/items`;
  console.log(`🧪 Test 2: Full path test - ${testUrl}`);
  
  try {
    const response2 = await fetch(testUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'apikey': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlxZXZ1eXlpb3JyZHNvcHVmZXl0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTE4MzE1ODUsImV4cCI6MjA2NzQwNzU4NX0.Kjr18soW5R5yMscDZcIRZdE1moPFE89S2fBhujJ2xOY',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ test: true })
    });
    console.log('📊 Full path response:', response2.status);
    const text2 = await response2.text();
    console.log('📄 Full path body:', text2);
  } catch (error) {
    console.error('❌ Full path test failed:', error);
  }

  // Test 3: Manual regex test
  console.log('🧪 Test 3: Manual regex validation');
  const pattern = /^\/inspections\/([^\/]+)\/items$/;
  const testPaths = [
    `/inspections/${testInspectionId}/items`,
    `/functions/v1/inspection-items/inspections/${testInspectionId}/items`,
    `inspections/${testInspectionId}/items`
  ];
  
  testPaths.forEach(path => {
    const matches = pattern.test(path);
    console.log(`🔍 Pattern test: "${path}" → ${matches}`);
  });
}

// Test just the inspections endpoint to compare
export async function testInspectionsEndpoint() {
  console.log('🧪 Testing working inspections endpoint for comparison...');
  
  const token = await authManager.getToken();
  if (!token) {
    console.log('❌ No token available');
    return;
  }

  try {
    const response = await fetch(`${BASE_URL}/inspections`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'apikey': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlxZXZ1eXlpb3JyZHNvcHVmZXl0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTE4MzE1ODUsImV4cCI6MjA2NzQwNzU4NX0.Kjr18soW5R5yMscDZcIRZdE1moPFE89S2fBhujJ2xOY'
      }
    });
    console.log('📊 Inspections response:', response.status);
    const text = await response.text();
    console.log('📄 Inspections body preview:', text.substring(0, 200) + '...');
  } catch (error) {
    console.error('❌ Inspections test failed:', error);
  }
}