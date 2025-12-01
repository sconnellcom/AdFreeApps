<?php
/**
 * Cache Busting Update Script
 * 
 * This script updates all .css?v= and .js?v= occurrences in HTML files
 * and the service worker with a new timestamp to break browser and PWA cache.
 * 
 * Run this script before publishing to ensure all caches are invalidated.
 * 
 * Usage: php update.php
 */

// Generate timestamp in YYYYMMDDHHmmss format (e.g., 20251201170653)
$timestamp = date('YmdHis');

echo "Cache Busting Update Script\n";
echo "============================\n";
echo "Timestamp: $timestamp\n\n";

// Get the directory where the script is located
$baseDir = __DIR__;

// Find all HTML files recursively
$htmlFiles = [];
$iterator = new RecursiveIteratorIterator(
    new RecursiveDirectoryIterator($baseDir, RecursiveDirectoryIterator::SKIP_DOTS)
);

foreach ($iterator as $file) {
    if ($file->isFile() && $file->getExtension() === 'html') {
        $htmlFiles[] = $file->getPathname();
    }
}

echo "Found " . count($htmlFiles) . " HTML file(s)\n\n";

// Update HTML files
$htmlUpdated = 0;
foreach ($htmlFiles as $htmlFile) {
    $content = file_get_contents($htmlFile);
    if ($content === false) {
        echo "Error reading file: $htmlFile\n";
        continue;
    }
    $originalContent = $content;
    
    // Replace .css?v=<anything> with .css?v=<timestamp>
    // Match patterns like style.css?v=2, style.css?v=20251201170653, etc.
    // Use [^"\'&\s]+ to stop at quotes, ampersands, or whitespace
    $content = preg_replace('/\.css\?v=[^"\'&\s]+/', '.css?v=' . $timestamp, $content);
    
    // Replace .js?v=<anything> with .js?v=<timestamp>
    $content = preg_replace('/\.js\?v=[^"\'&\s]+/', '.js?v=' . $timestamp, $content);
    
    if ($content !== $originalContent) {
        file_put_contents($htmlFile, $content);
        // Handle both Unix and Windows path separators
        $relativePath = str_replace([$baseDir . DIRECTORY_SEPARATOR, $baseDir . '/'], '', $htmlFile);
        echo "Updated: $relativePath\n";
        $htmlUpdated++;
    }
}

echo "\nUpdated $htmlUpdated HTML file(s)\n\n";

// Update the service worker (sw.js)
$swFile = $baseDir . '/sw.js';
if (file_exists($swFile)) {
    $swContent = file_get_contents($swFile);
    if ($swContent === false) {
        echo "Error reading file: sw.js\n";
    } else {
        $originalSwContent = $swContent;
        
        // Update CACHE_NAME with new timestamp
        // Match pattern like: const CACHE_NAME = 'ad-free-apps-v3';
        $swContent = preg_replace(
            "/const CACHE_NAME = '[^']+';/",
            "const CACHE_NAME = 'ad-free-apps-v$timestamp';",
            $swContent
        );
        
        // Update .css?v= and .js?v= in urlsToCache array
        // Use [^"\'&\s]+ to stop at quotes, ampersands, or whitespace (consistent with HTML patterns)
        $swContent = preg_replace('/\.css\?v=[^"\'&\s]+/', '.css?v=' . $timestamp, $swContent);
        $swContent = preg_replace('/\.js\?v=[^"\'&\s]+/', '.js?v=' . $timestamp, $swContent);
        
        if ($swContent !== $originalSwContent) {
            file_put_contents($swFile, $swContent);
            echo "Updated: sw.js (service worker)\n";
            echo "  - CACHE_NAME updated to 'ad-free-apps-v$timestamp'\n";
            echo "  - Updated versioned resource URLs\n";
        } else {
            echo "sw.js: No changes needed\n";
        }
    }
}

echo "\n============================\n";
echo "Cache busting complete!\n";
echo "\n";
echo "Notes:\n";
echo "- All .css?v= and .js?v= references have been updated to v=$timestamp\n";
echo "- Service worker CACHE_NAME has been updated\n";
echo "- PWA will download fresh resources on next visit\n";
echo "- Offline functionality remains intact after cache refresh\n";
