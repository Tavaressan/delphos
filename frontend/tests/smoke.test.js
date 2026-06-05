const assert = require('assert');
const fs = require('fs');
const path = require('path');

console.log("Running smoke test for Environment Variables...");

try {
  // Read .env file directly to check if the public backend URL is configured
  const envPath = path.join(__dirname, '../../.env');
  if (fs.existsSync(envPath)) {
    const envContent = fs.readFileSync(envPath, 'utf8');
    assert(envContent.includes('NEXT_PUBLIC_BACKEND_URL='), "NEXT_PUBLIC_BACKEND_URL should be defined in .env");
    
    const backendUrlMatch = envContent.match(/NEXT_PUBLIC_BACKEND_URL=(.+)/);
    assert(backendUrlMatch, "NEXT_PUBLIC_BACKEND_URL should have a value");
    
    const backendUrl = backendUrlMatch[1].trim();
    assert(backendUrl.startsWith('http://') || backendUrl.startsWith('https://'), "NEXT_PUBLIC_BACKEND_URL should start with http:// or https://");
    console.log(`Verified env variable: NEXT_PUBLIC_BACKEND_URL=${backendUrl}`);
  } else {
    console.log("No .env file found at root, skipping file parsing check.");
  }

  console.log("Smoke test passed successfully!");
  process.exit(0);
} catch (error) {
  console.error("Smoke test failed:", error.message);
  process.exit(1);
}
