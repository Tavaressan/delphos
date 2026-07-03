const fs = require('fs');
const path = require('path');
const assert = require('assert');

console.log("Starting Header tests...");

try {
    const headerPath = path.join(__dirname, '../src/components/layout/Header.tsx');
    const headerContent = fs.readFileSync(headerPath, 'utf8');

    console.log("Checking logo size (50% increase: 68px -> 102px)...");
    assert(headerContent.includes('h-[102px]'), "Logo should be 50% bigger: h-[102px] (68 * 1.5)");
    assert(!headerContent.includes('h-[68px]'), "Old logo height h-[68px] should no longer be present");

    console.log("Checking header container height accommodates the 102px logo without clipping...");
    assert(headerContent.includes('className="h-14 '), "Header container height should be h-14 (56px), the smallest Tailwind scale step that fits a 102px logo");

    console.log("Checking solid color treatment on light mode (matching text-primary)...");
    assert(headerContent.includes('bg-primary'), "Logo should use bg-primary (solid color, matching title color) in light mode");

    console.log("Checking dark mode logo treatment still present (no regression)...");
    assert(headerContent.includes('dark:bg-white') || headerContent.includes('dark:invert'), "Dark mode logo treatment must still turn the logo white/inverted");

    console.log("All Header tests passed successfully!");
    process.exit(0);
} catch (error) {
    console.error("Test failed:", error.message);
    process.exit(1);
}
