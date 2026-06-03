const fs = require('fs');
const path = require('path');
const assert = require('assert');

console.log("Starting frontend layout tests...");

try {
    // Test Root Layout
    const layoutPath = path.join(__dirname, '../src/app/layout.tsx');
    const layoutContent = fs.readFileSync(layoutPath, 'utf8');

    console.log("Checking Root Layout...");
    // Check h-full and lang="pt-br" in html tag
    assert(layoutContent.includes('lang="pt-br"'), "Root layout should have lang=\"pt-br\"");
    assert(layoutContent.includes('className="h-full"'), "Root layout should have h-full className");
    assert(layoutContent.includes('<html'), "Root layout should contain <html tag");
    console.log("Root Layout checks passed! (TT-01)");

    // Test Auth Layout
    const authLayoutPath = path.join(__dirname, '../src/app/auth/layout.tsx');
    const authLayoutContent = fs.readFileSync(authLayoutPath, 'utf8');

    console.log("Checking Auth Layout...");
    assert(authLayoutContent.includes('flex'), "Auth layout should use flex");
    assert(authLayoutContent.includes('items-center'), "Auth layout should use items-center");
    assert(authLayoutContent.includes('justify-center'), "Auth layout should use justify-center");
    console.log("Auth Layout checks passed! (TT-02)");

    console.log("All frontend tests passed successfully!");
    process.exit(0);
} catch (error) {
    console.error("Test failed:", error.message);
    process.exit(1);
}
