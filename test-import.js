#!/usr/bin/env node

import fs from 'fs';

// Simple test to verify import script works
async function testImport() {
  try {
    // Login
    const loginResponse = await fetch('http://localhost:5000/api/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: 'admin', password: 'admin123' })
    });
    
    if (!loginResponse.ok) {
      throw new Error('Login failed');
    }
    
    const cookies = loginResponse.headers.get('set-cookie');
    console.log('✓ Login successful');
    
    // Test tag creation
    const tagResponse = await fetch('http://localhost:5000/api/tags', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': cookies
      },
      body: JSON.stringify({ tag: 'test-tag' })
    });
    
    if (tagResponse.ok) {
      console.log('✓ Tag creation working');
    } else {
      console.log('✗ Tag creation failed:', await tagResponse.text());
    }
    
    // Test reference creation
    const refResponse = await fetch('http://localhost:5000/api/references', {
      method: 'POST', 
      headers: {
        'Content-Type': 'application/json',
        'Cookie': cookies
      },
      body: JSON.stringify({
        title: 'Test Reference',
        link: 'https://example.com',
        description: 'Test description',
        category: 'Tutorials & Blogs',
        tags: ['test-tag']
      })
    });
    
    if (refResponse.ok) {
      console.log('✓ Reference creation working');
      console.log('Import script should work correctly now');
    } else {
      console.log('✗ Reference creation failed:', await refResponse.text());
    }
    
  } catch (error) {
    console.error('Test failed:', error.message);
  }
}

testImport();