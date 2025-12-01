
<?php
// PRODUCTION-READY GITHUB ZIP UPDATER
// Place in web root, configure $zipUrl, run once, then secure/remove

while (ob_get_level()) ob_end_clean(); // Clear all output buffers
ob_implicit_flush(1);                   // Auto-flush output

set_time_limit(300);        // 5min timeout
ini_set('memory_limit', '512M');
ini_set('max_execution_time', 300);
ignore_user_abort(false);   // Stop on disconnect

// CONFIGURATION
$zipUrl = 'https://github.com/sconnellcom/Metronome/archive/refs/heads/main.zip';
$zipFile = 'update.zip';
$lockFile = 'update.lock';
$selfScript = basename(__FILE__);
$extractPath = __DIR__ . '/';

// FILE LOCKING - Prevent concurrent runs
$fp = fopen($lockFile, 'w');
if (!$fp || !flock($fp, LOCK_EX | LOCK_NB)) {
    die("Update already running or lock failed.\n");
}
register_shutdown_function(function() use ($fp, $lockFile) {
    flock($fp, LOCK_UN);
    fclose($fp);
    unlink($lockFile);
});

function getZipFilesRecursive($zip, &$rootFolder, &$filesInZip) {
    $rootFolderDetermined = false;
    for ($i = 0; $i < $zip->numFiles; $i++) {
        $entryName = $zip->getNameIndex($i);
        if (!$rootFolderDetermined && strpos($entryName, '/') !== false) {
            $firstSlashPos = strpos($entryName, '/');
            $rootFolder = substr($entryName, 0, $firstSlashPos + 1);
            $rootFolderDetermined = true;
        }
        $relativePath = $rootFolderDetermined ? substr($entryName, strlen($rootFolder)) : $entryName;
        if ($relativePath !== '' && strpos($relativePath, '../') === false) {
            $filesInZip[] = $relativePath;
        }
    }
}

function scanDirRecursive($dir, &$currentFiles, $exclude = []) {
    $items = @scandir($dir);
    if ($items === false) return;

    foreach ($items as $item) {
        if ($item === '.' || $item === '..' || in_array($item, $exclude, true)) continue;

        $fullPath = $dir . $item;
        if (!is_readable($fullPath)) continue;

        $relPath = substr($fullPath, strlen(__DIR__) + 1);

        if (is_file($fullPath)) {
            $currentFiles[] = $relPath;
        } elseif (is_dir($fullPath)) {
            $currentFiles[] = $relPath . '/';
            scanDirRecursive($fullPath . '/', $currentFiles, $exclude);
        }
    }
}

function deleteNotInZip($filesToKeep, $exclude) {
    $currentFiles = [];
    scanDirRecursive(__DIR__ . '/', $currentFiles, $exclude);

    foreach ($currentFiles as $currentFile) {
        if (!in_array($currentFile, $filesToKeep, true)) {
            $fullPath = __DIR__ . '/' . $currentFile;
            if (strpos($fullPath, __DIR__) !== 0) continue; // Security: block path traversal

            if (is_file($fullPath)) {
                @unlink($fullPath);
            } elseif (is_dir($fullPath) && substr($currentFile, -1) === '/') {
                @rmdir($fullPath); // Only empty dirs
            }
        }
    }
}
function curlDownloadFile($url, $dest) {
    $ch = curl_init($url);
    $fp = fopen($dest, 'w');

    curl_setopt($ch, CURLOPT_FILE, $fp);
    curl_setopt($ch, CURLOPT_FOLLOWLOCATION, true);
    curl_setopt($ch, CURLOPT_FAILONERROR, true);
    curl_setopt($ch, CURLOPT_USERAGENT, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)');
    curl_setopt($ch, CURLOPT_REFERER, 'https://github.com/');
    curl_setopt($ch, CURLOPT_SSL_VERIFYHOST, 2);
    curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, true);
    curl_setopt($ch, CURLOPT_TIMEOUT, 120);

    $success = curl_exec($ch);
    if (!$success) {
        $error = curl_error($ch);
        curl_close($ch);
        fclose($fp);
        unlink($dest);
        die("cURL download error: $error\n");
    }

    curl_close($ch);
    fclose($fp);
}

// VALIDATED DOWNLOAD
echo "Downloading ZIP...\n";
flush();
curlDownloadFile($zipUrl, $zipFile);
chmod($zipFile, 0644);
echo "Download complete. File size: " . filesize($zipFile) . " bytes\n";
flush();

// PROCESS ZIP
echo "Opening ZIP file...\n";
flush();

if (!class_exists('ZipArchive')) {
    die("ZipArchive class not available. Install php-zip extension.\n");
}

if (!file_exists($zipFile)) {
    die("ZIP file disappeared after download.\n");
}

$zip = new ZipArchive();
$openResult = $zip->open($zipFile);
if ($openResult !== TRUE) {
    $errors = [
        ZipArchive::ER_EXISTS => 'File already exists',
        ZipArchive::ER_INCONS => 'Zip archive inconsistent',
        ZipArchive::ER_INVAL => 'Invalid argument',
        ZipArchive::ER_MEMORY => 'Memory allocation failure',
        ZipArchive::ER_NOENT => 'No such file',
        ZipArchive::ER_NOZIP => 'Not a zip archive',
        ZipArchive::ER_OPEN => 'Can\'t open file',
        ZipArchive::ER_READ => 'Read error',
        ZipArchive::ER_SEEK => 'Seek error'
    ];
    $errorMsg = isset($errors[$openResult]) ? $errors[$openResult] : 'Unknown error';
    @unlink($zipFile);
    die("Failed to open ZIP file. Error code: $openResult ($errorMsg)\n");
}
echo "ZIP opened successfully.\n";
flush();

$filesInZip = [];
$rootFolder = 'Metronome-main';
echo "Analyzing ZIP contents...\n";
flush();
getZipFilesRecursive($zip, $rootFolder, $filesInZip);

if (empty($filesInZip)) {
    $zip->close();
    @unlink($zipFile);
    die("No valid files found in ZIP.\n");
}
echo "Found " . count($filesInZip) . " files in ZIP.\n";
flush();

// CLEANUP OLD FILES
echo "Cleaning obsolete files...\n";
deleteNotInZip($filesInZip, [$selfScript, $zipFile, $lockFile]);

// EXTRACT NEW FILES
echo "Extracting " . count($filesInZip) . " files...\n";
flush();
$extracted = 0;
for ($i = 0; $i < $zip->numFiles; $i++) {
    $entryName = $zip->getNameIndex($i);
    $relativePath = substr($entryName, strlen($rootFolder));
    if ($relativePath === '' || strpos($relativePath, '../') !== false) continue;

    $dstPath = __DIR__ . '/' . $relativePath;
    if (strpos($dstPath, __DIR__) !== 0) continue; // Security

    // Skip if it's a directory entry
    if (substr($entryName, -1) === '/') {
        if (!is_dir($dstPath)) {
            mkdir($dstPath, 0755, true);
        }
        continue;
    }

    // Create parent directory if needed
    $dirPath = dirname($dstPath);
    if (!is_dir($dirPath)) {
        mkdir($dirPath, 0755, true);
    }

    // Extract file
    // Delete existing file first to avoid permission issues
    if (file_exists($dstPath)) {
        @unlink($dstPath);
    }
    
    $zipStream = $zip->getStream($entryName);
    if ($zipStream) {
        $outFile = @fopen($dstPath, 'wb');
        if ($outFile) {
            while (!feof($zipStream)) {
                fwrite($outFile, fread($zipStream, 8192));
            }
            fclose($outFile);
            chmod($dstPath, 0644);
            $extracted++;
        } else {
            echo "Warning: Could not write to $relativePath\n";
            flush();
        }
        fclose($zipStream);
    }
}
flush();

$zip->close();
@unlink($zipFile);

echo "Update completed: $extracted files extracted.\n";
echo "Lock released. Script remains for manual re-runs.\n";
?>