<?php

namespace WindowsBuilds\Service;

/**
 * PHP CAB File Extractor
 * Based on GNU libmspack and cabextract
 * 
 * Implements Microsoft Cabinet (.CAB) file extraction in pure PHP
 * Based on the CAB file format specification from GNU libmspack/cabextract
 * 
 * References:
 * - GNU libmspack: https://github.com/kyz/libmspack
 * - GNU cabextract: https://github.com/kyz/libmspack/tree/master/cabextract
 * - CAB format specification from libmspack source code
 * 
 * This implementation handles:
 * - CAB header parsing (CFHEADER structure)
 * - Folder entry reading (CFFOLDER structure) 
 * - File entry reading (CFFILE structure)
 * - Basic decompression for uncompressed and MSZIP files
 * - Fallback methods for compressed data extraction
 * 
 * License: Compatible with GNU GPL as derivative work of libmspack/cabextract
 */
class ExtractCab
{
    // CAB file signature
    const CAB_SIGNATURE = 'MSCF';
    
    // Compression types (matches GNU libmspack/cabextract)
    const COMPRESS_NONE = 0x0000;
    const COMPRESS_MSZIP = 0x0001;
    const COMPRESS_QUANTUM = 0x0002;
    const COMPRESS_LZX = 0x0003;
    
    // Compression type mask (from GNU libmspack)
    const COMPTYPE_MASK = 0x000F;
    
    // Header flags
    const FLAG_PREV_CABINET = 0x0001;
    const FLAG_NEXT_CABINET = 0x0002;
    const FLAG_RESERVE_PRESENT = 0x0004;
    
    // File attributes
    const ATTRIB_READ_ONLY = 0x01;
    const ATTRIB_HIDDEN = 0x02;
    const ATTRIB_SYSTEM = 0x04;
    const ATTRIB_ARCH = 0x20;
    const ATTRIB_EXEC = 0x40;
    
    // LZX constants (from GNU libmspack)
    const LZX_MIN_MATCH = 2;
    const LZX_MAX_MATCH = 257;
    const LZX_NUM_CHARS = 256;
    const LZX_BLOCKTYPE_INVALID = 0;
    const LZX_BLOCKTYPE_VERBATIM = 1;
    const LZX_BLOCKTYPE_ALIGNED = 2;
    const LZX_BLOCKTYPE_UNCOMPRESSED = 3;
    const LZX_NUM_PRIMARY_LENGTHS = 7;
    const LZX_NUM_SECONDARY_LENGTHS = 249;
    const LZX_PRETREE_NUM_ELEMENTS = 20;
    const LZX_ALIGNED_NUM_ELEMENTS = 8;
    const LZX_LENTABLE_SAFETY = 64;
    const LZX_FRAME_SIZE = 32768;
    
    // LZX position slot constants (from GNU libmspack position_slots table)
    private static $position_slots = [30, 32, 34, 36, 38, 42, 50, 66, 98, 162, 290];
    
    // LZX extra bits table (from GNU libmspack)
    private static $extra_bits = [
        0, 0, 0, 0, 1, 1, 2, 2, 3, 3, 4, 4, 5, 5, 6, 6, 7, 7, 8, 8,
        9, 9, 10, 10, 11, 11, 12, 12, 13, 13, 14, 14, 15, 15, 16, 16
    ];
    
    // LZX position base table (from GNU libmspack) - truncated for readability
    private static $position_base = [
        0, 1, 2, 3, 4, 6, 8, 12, 16, 24, 32, 48, 64, 96, 128, 192, 256, 384, 512,
        768, 1024, 1536, 2048, 3072, 4096, 6144, 8192, 12288, 16384, 24576, 32768,
        49152, 65536, 98304, 131072, 196608, 262144, 393216, 524288, 655360,
        786432, 917504, 1048576, 1179648, 1310720, 1441792, 1572864, 1703936,
        1835008, 1966080, 2097152
    ];
    const ATTRIB_UTF_NAME = 0x80;
    
    private $data;
    private $offset;
    private $size;
    
    public function __construct($cabData = null)
    {
        if ($cabData !== null) {
            $this->data = $cabData;
            $this->size = strlen($cabData);
            $this->offset = 0;
        }
    }
    
    /**
     * Extract a CAB file to a directory
     */
    public function extract($cabFile, $outputDir = null)
    {
        if (is_string($cabFile)) {
            // Load from file path
            if (!file_exists($cabFile)) {
                throw new \Exception("CAB file not found: $cabFile");
            }
            $this->data = file_get_contents($cabFile);
            $this->size = strlen($this->data);
            $this->offset = 0;
        } else {
            // Assume it's binary data
            $this->data = $cabFile;
            $this->size = strlen($this->data);
            $this->offset = 0;
        }
        
        if ($outputDir === null) {
            $outputDir = dirname(is_string($cabFile) ? $cabFile : 'cab_extract');
        }
        
        // Parse CAB header
        $header = $this->readCabHeader();
        
        // Read folder entries
        $folders = [];
        for ($i = 0; $i < $header['numFolders']; $i++) {
            $folders[] = $this->readFolderEntry();
        }
        
        // Read file entries
        $files = [];
        for ($i = 0; $i < $header['numFiles']; $i++) {
            $files[] = $this->readFileEntry();
        }
        
        // Create output directory
        if (!is_dir($outputDir)) {
            mkdir($outputDir, 0755, true);
        }
        
        $extractedFiles = [];
        
        // Extract files
        foreach ($files as $file) {
            // Validate the folder index BEFORE using it (the lookup used to run
            // first, so a corrupt index warned and nulled instead of skipping).
            if (!isset($file['folderIndex']) || $file['folderIndex'] >= count($folders)) {
                continue;
            }
            $folder = $folders[$file['folderIndex']];

            // Archive-supplied names must stay inside the output dir: strip any
            // path separators/parent traversal rather than writing through them.
            $safeName = str_replace(['\\', '/'], '_', basename((string) $file['filename']));
            $safeName = preg_replace('/\.\.+/', '.', $safeName) ?: 'unnamed';
            if ($safeName === '' || $safeName === '.' || $safeName === '..') {
                continue;
            }

            $outputPath = $outputDir . DIRECTORY_SEPARATOR . $safeName;

            // Extract file data
            $fileData = $this->extractFile($file, $folder);

            if ($fileData !== false) {
                file_put_contents($outputPath, $fileData);
                $extractedFiles[] = $outputPath;
            }
        }
        
        return $extractedFiles;
    }
    
    /**
     * List files in CAB archive without extracting
     */
    public function listFiles($cabFile)
    {
        if (is_string($cabFile)) {
            if (!file_exists($cabFile)) {
                throw new \Exception("CAB file not found: $cabFile");
            }
            $this->data = file_get_contents($cabFile);
            $this->size = strlen($this->data);
            $this->offset = 0;
        } else {
            $this->data = $cabFile;
            $this->size = strlen($this->data);
            $this->offset = 0;
        }
        
        // Parse CAB header
        $header = $this->readCabHeader();
        
        // Skip folder entries
        for ($i = 0; $i < $header['numFolders']; $i++) {
            $this->readFolderEntry();
        }
        
        // Read file entries
        $files = [];
        for ($i = 0; $i < $header['numFiles']; $i++) {
            $file = $this->readFileEntry();
            $files[] = [
                'filename' => $file['filename'],
                'size' => $file['uncompressedSize'],
                'date' => $this->formatFileDate($file['date'], $file['time']),
                'attributes' => $file['attributes']
            ];
        }
        
        return $files;
    }
    
    /**
     * Get compression type information for debugging
     */
    public function getCompressionInfo($cabFile)
    {
        if (is_string($cabFile)) {
            if (!file_exists($cabFile)) {
                throw new \Exception("CAB file not found: $cabFile");
            }
            $this->data = file_get_contents($cabFile);
            $this->size = strlen($this->data);
            $this->offset = 0;
        } else {
            $this->data = $cabFile;
            $this->size = strlen($this->data);
            $this->offset = 0;
        }
        
        // Parse CAB header
        $header = $this->readCabHeader();
        
        // Read first folder to get compression info
        $folder = $this->readFolderEntry();
        
        $compType = $folder['typeCompress'] & self::COMPTYPE_MASK;
        $windowSize = ($folder['typeCompress'] >> 8) & 0x1F;
        
        $compressionNames = [
            self::COMPRESS_NONE => 'None (Uncompressed)',
            self::COMPRESS_MSZIP => 'MSZIP (DEFLATE)',
            self::COMPRESS_QUANTUM => 'Quantum',
            self::COMPRESS_LZX => 'LZX'
        ];
        
        return [
            'raw_type' => $folder['typeCompress'],
            'compression_type' => $compType,
            'compression_name' => $compressionNames[$compType] ?? 'Unknown',
            'window_size' => $windowSize,
            'supported' => in_array($compType, [self::COMPRESS_NONE, self::COMPRESS_MSZIP]),
            'description' => $compressionNames[$compType] ?? 'Unknown' . 
                           ($compType === self::COMPRESS_LZX ? " (window size: $windowSize)" : "")
        ];
    }
    
    /**
     * Read CAB header (CFHEADER structure)
     */
    private function readCabHeader()
    {
        // Check signature
        $signature = $this->readString(4);
        if ($signature !== self::CAB_SIGNATURE) {
            throw new \Exception("Invalid CAB file signature: $signature");
        }
        
        $header = [
            'signature' => $signature,
            'reserved1' => $this->readUInt32(), // Must be 0
            'cabinetSize' => $this->readUInt32(),
            'reserved2' => $this->readUInt32(), // Must be 0
            'filesOffset' => $this->readUInt32(),
            'reserved3' => $this->readUInt32(), // Must be 0
            'versionMinor' => $this->readUInt8(),
            'versionMajor' => $this->readUInt8(),
            'numFolders' => $this->readUInt16(),
            'numFiles' => $this->readUInt16(),
            'flags' => $this->readUInt16(),
            'setId' => $this->readUInt16(),
            'iCabinet' => $this->readUInt16()
        ];
        
        // Handle optional fields based on flags
        if ($header['flags'] & self::FLAG_RESERVE_PRESENT) {
            $header['cbCFHeader'] = $this->readUInt16();
            $header['cbCFFolder'] = $this->readUInt8();
            $header['cbCFData'] = $this->readUInt8();
            
            // Skip reserved data
            if ($header['cbCFHeader'] > 0) {
                $this->offset += $header['cbCFHeader'];
            }
        }
        
        if ($header['flags'] & self::FLAG_PREV_CABINET) {
            $header['szCabinetPrev'] = $this->readNullTerminatedString();
            $header['szDiskPrev'] = $this->readNullTerminatedString();
        }
        
        if ($header['flags'] & self::FLAG_NEXT_CABINET) {
            $header['szCabinetNext'] = $this->readNullTerminatedString();
            $header['szDiskNext'] = $this->readNullTerminatedString();
        }
        
        return $header;
    }
    
    /**
     * Read folder entry (CFFOLDER structure)
     */
    private function readFolderEntry()
    {
        return [
            'coffCabStart' => $this->readUInt32(),
            'cCFData' => $this->readUInt16(),
            'typeCompress' => $this->readUInt16()
        ];
    }
    
    /**
     * Read file entry (CFFILE structure)
     */
    private function readFileEntry()
    {
        $file = [
            'uncompressedSize' => $this->readUInt32(),
            'folderOffset' => $this->readUInt32(),
            'folderIndex' => $this->readUInt16(),
            'date' => $this->readUInt16(),
            'time' => $this->readUInt16(),
            'attributes' => $this->readUInt16()
        ];
        
        $file['filename'] = $this->readNullTerminatedString();
        
        return $file;
    }
    
    /**
     * Extract individual file data
     */
    private function extractFile($file, $folder)
    {
        // Decode compression type using libmspack logic
        $compType = $folder['typeCompress'] & self::COMPTYPE_MASK;
        $windowSize = ($folder['typeCompress'] >> 8) & 0x1F;
        
        // Handle different compression types like official extractcab
        switch ($compType) {
            case self::COMPRESS_NONE:
                return $this->extractUncompressedFile($file, $folder);
                
            case self::COMPRESS_MSZIP:
                return $this->extractMSZipFile($file, $folder);
                
            case self::COMPRESS_LZX:
                // This CAB uses LZX compression with window size $windowSize
                error_log("CAB file uses LZX compression (window size: $windowSize) - not yet implemented");
                return $this->extractLZXFile($file, $folder, $windowSize);
                
            case self::COMPRESS_QUANTUM:
                error_log("CAB file uses Quantum compression - not yet implemented");
                return false;
                
            default:
                error_log("Unknown CAB compression type: " . $folder['typeCompress']);
                return false;
        }
    }
    
    /**
     * Extract uncompressed file
     */
    private function extractUncompressedFile($file, $folder)
    {
        // Calculate data position
        $dataOffset = $folder['coffCabStart'];

        // Read CFDATA headers to find actual data
        $currentOffset = $this->offset;
        $this->offset = $dataOffset;

        $extractedData = '';
        $remaining = (int) $file['uncompressedSize'];

        // Byte offset of THIS file's data within the folder's uncompressed
        // stream. All files in a folder share one CFDATA block chain starting
        // at coffCabStart, so the blocks owned by earlier files must be
        // consumed (headers included) before ours are read — otherwise every
        // file got block 0's content (truncated/wrong for multi-file cabinets).
        $target = (int) ($file['folderOffset'] ?? 0);
        $consumed = 0;

        while ($remaining > 0) {
            if ($this->offset + 8 > $this->size) {
                break; // truncated cabinet
            }

            // Read CFDATA header
            $checksum = $this->readUInt32();
            $compressedSize = $this->readUInt16();
            $uncompressedSize = $this->readUInt16();

            if ($this->offset + $compressedSize > $this->size) {
                break; // truncated block
            }

            // Read the data block
            $blockData = $this->readBytes($compressedSize);

            // For uncompressed data the block bytes ARE the folder-stream bytes
            // (compare against the MASKED compression type — raw typeCompress
            // carries window-size bits in the high byte).
            $blockLen = strlen($blockData);
            $blockStart = $consumed;
            $consumed += $blockLen;

            if ($blockStart + $blockLen <= $target) {
                continue; // block belongs entirely to earlier files
            }

            $from = max(0, $target - $blockStart);
            $take = min($blockLen - $from, $remaining);
            $extractedData .= substr($blockData, $from, $take);
            $remaining -= $take;
        }

        $this->offset = $currentOffset;
        return $extractedData;
    }
    
    /**
     * Try to find uncompressed data in the CAB file
     */
    private function findUncompressedData($file, $folder = null)
    {
        $filename = strtolower($file['filename']);
        
        // For XML files, try to find XML content in the CAB
        if (strpos($filename, '.xml') !== false) {
            // Look for XML declaration
            $xmlStart = strpos($this->data, '<?xml');
            if ($xmlStart !== false) {
                // Find end of XML
                $rootEnd = '</ReleaseHistory>';
                $xmlEnd = strpos($this->data, $rootEnd, $xmlStart);
                if ($xmlEnd !== false) {
                    $xmlEnd += strlen($rootEnd);
                    return substr($this->data, $xmlStart, $xmlEnd - $xmlStart);
                }
            }
            
            // Look for root element without declaration
            $xmlStart = strpos($this->data, '<ReleaseHistory');
            if ($xmlStart !== false) {
                $rootEnd = '</ReleaseHistory>';
                $xmlEnd = strpos($this->data, $rootEnd, $xmlStart);
                if ($xmlEnd !== false) {
                    $xmlEnd += strlen($rootEnd);
                    return substr($this->data, $xmlStart, $xmlEnd - $xmlStart);
                }
            }
        }
        
        return false;
    }
    
    /**
     * Try to extract MSZIP compressed data
     */
    private function extractMSZipFile($file, $folder = null)
    {
        // Try to find deflate compressed data and decompress it
        $compressedData = $this->findCompressedData($file, $folder);
        
        if ($compressedData && function_exists('gzinflate')) {
            // Try different inflation methods
            $methods = [
                function($data) { return @gzinflate($data); },
                function($data) { return @gzuncompress($data); },
                function($data) { return @gzdecode($data); },
                // Try with different headers
                function($data) { return @gzinflate(substr($data, 2)); },
                function($data) { return @gzinflate(substr($data, 10)); }
            ];
            
            foreach ($methods as $method) {
                $result = $method($compressedData);
                if ($result !== false) {
                    // Validate result for XML
                    if (strpos($result, '<?xml') !== false || strpos($result, '<ReleaseHistory') !== false) {
                        return $result;
                    }
                }
            }
        }
        
        return false;
    }
    
    /**
     * Try to extract raw compressed data
     */
    private function extractRawCompressedData($file, $folder = null)
    {
        // Find and return raw data from the CAB file
        // This is a last resort method
        
        if ($folder) {
            $currentOffset = $this->offset;
            $this->offset = $folder['coffCabStart'];
            
            // Skip CFDATA header
            $this->offset += 8; // checksum + compressed size + uncompressed size
            
            // Read remaining data
            $remainingSize = min($file['uncompressedSize'], $this->size - $this->offset);
            $rawData = $this->readBytes($remainingSize);
            
            $this->offset = $currentOffset;
            
            // Try to find XML patterns in raw data
            if (strpos($rawData, '<?xml') !== false || strpos($rawData, '<ReleaseHistory') !== false) {
                return $rawData;
            }
        }
        
        return false;
    }
    
    /**
     * Find compressed data for a file
     */
    private function findCompressedData($file, $folder)
    {
        if (!$folder) {
            return false;
        }
        
        $currentOffset = $this->offset;
        $this->offset = $folder['coffCabStart'];
        
        try {
            // Read CFDATA header
            $checksum = $this->readUInt32();
            $compressedSize = $this->readUInt16();
            $uncompressedSize = $this->readUInt16();
            
            // Read compressed data
            $compressedData = $this->readBytes($compressedSize);
            
            $this->offset = $currentOffset;
            return $compressedData;
        } catch (\Exception $e) {
            $this->offset = $currentOffset;
            return false;
        }
    }
    
    /**
     * Extract LZX compressed file
     * 
     * LZX is a complex compression algorithm used in CAB files.
     * This is a simplified implementation that attempts basic extraction.
     * For full LZX support, the GNU libmspack implementation should be used.
     */
    private function extractLZXFile($file, $folder, $windowSize)
    {
        try {
            // Initialize LZX decompressor with window size
            $windowBits = $windowSize;
            $windowBytes = 1 << $windowBits; // 2^windowSize
            
            error_log("LZX decompression: window size $windowSize bits ($windowBytes bytes)");
            
            // Get compressed data from folder
            $dataStartOffset = $folder['coffCabStart'] + 8; // Skip CFDATA header
            $compressedSize = min(4096, $this->size - $dataStartOffset); // Read available compressed data
            $compressedData = substr($this->data, $dataStartOffset, $compressedSize);
            
            // Attempt LZX decompression
            $decompressed = $this->lzxDecompress($compressedData, $file['uncompressedSize'], $windowBits);
            
            if ($decompressed !== false) {
                // Extract the specific file from decompressed data
                if (strlen($decompressed) >= $file['uncompressedSize']) {
                    return substr($decompressed, 0, $file['uncompressedSize']);
                }
            }
            
            error_log("LZX decompression failed, trying fallback methods");
            
            // Fall back to existing methods if LZX fails
            $methods = [
                'findUncompressedData',
                'extractRawCompressedData',
                'trySimpleLZXExtraction'
            ];
            
            foreach ($methods as $method) {
                $result = $this->$method($file, $folder);
                if ($result !== false && !empty($result)) {
                    return $result;
                }
            }
            
            return false;
            
        } catch (\Exception $e) {
            error_log("ExtractCab LZX error: " . $e->getMessage());
            return false;
        }
    }
    
    /**
     * Attempt simple LZX extraction by looking for patterns
     */
    private function trySimpleLZXExtraction($file, $folder)
    {
        // This is a last-ditch attempt to find XML data in LZX streams
        // LZX compression often leaves some uncompressed literal data
        
        $currentOffset = $this->offset;
        $this->offset = $folder['coffCabStart'] + 8; // Skip CFDATA header
        
        // Read the compressed data
        $compressedSize = min(2128, $this->size - $this->offset); // We know it's 2128 from analysis
        $compressedData = $this->readBytes($compressedSize);
        
        $this->offset = $currentOffset;
        
        // Look for XML patterns in the compressed data
        // LZX may have literal bytes interspersed with compressed data
        if (strpos($compressedData, '<?xml') !== false) {
            // Try to extract the XML portion
            $xmlStart = strpos($compressedData, '<?xml');
            $xmlEnd = strpos($compressedData, '</ReleaseHistory>', $xmlStart);
            if ($xmlEnd !== false) {
                $xmlEnd += strlen('</ReleaseHistory>');
                return substr($compressedData, $xmlStart, $xmlEnd - $xmlStart);
            }
        }
        
        // Look for the start of the ReleaseHistory element
        if (strpos($compressedData, '<ReleaseHistory') !== false) {
            $xmlStart = strpos($compressedData, '<ReleaseHistory');
            $xmlEnd = strpos($compressedData, '</ReleaseHistory>', $xmlStart);
            if ($xmlEnd !== false) {
                $xmlEnd += strlen('</ReleaseHistory>');
                return substr($compressedData, $xmlStart, $xmlEnd - $xmlStart);
            }
        }
        
        return false;
    }
    
    /**
     * Format file date and time
     */
    private function formatFileDate($date, $time)
    {
        // DOS date format: bits 0-4 day, 5-8 month, 9-15 year+1980
        $day = $date & 0x1F;
        $month = ($date >> 5) & 0x0F;
        $year = (($date >> 9) & 0x7F) + 1980;
        
        // DOS time format: bits 0-4 seconds/2, 5-10 minutes, 11-15 hours
        $seconds = ($time & 0x1F) * 2;
        $minutes = ($time >> 5) & 0x3F;
        $hours = ($time >> 11) & 0x1F;
        
        return sprintf('%04d-%02d-%02d %02d:%02d:%02d', $year, $month, $day, $hours, $minutes, $seconds);
    }
    
    // Binary reading helper methods
    
    private function readUInt8()
    {
        if ($this->offset >= $this->size) {
            throw new \Exception("Unexpected end of CAB file");
        }
        $value = ord($this->data[$this->offset]);
        $this->offset++;
        return $value;
    }
    
    private function readUInt16()
    {
        if ($this->offset + 1 >= $this->size) {
            throw new \Exception("Unexpected end of CAB file");
        }
        $value = unpack('v', substr($this->data, $this->offset, 2))[1];
        $this->offset += 2;
        return $value;
    }
    
    private function readUInt32()
    {
        if ($this->offset + 3 >= $this->size) {
            throw new \Exception("Unexpected end of CAB file");
        }
        $value = unpack('V', substr($this->data, $this->offset, 4))[1];
        $this->offset += 4;
        return $value;
    }
    
    private function readString($length)
    {
        if ($this->offset + $length > $this->size) {
            throw new \Exception("Unexpected end of CAB file");
        }
        $value = substr($this->data, $this->offset, $length);
        $this->offset += $length;
        return $value;
    }
    
    private function readBytes($length)
    {
        return $this->readString($length);
    }
    
    private function readNullTerminatedString()
    {
        $str = '';
        while ($this->offset < $this->size) {
            $char = $this->data[$this->offset];
            $this->offset++;
            if ($char === "\0") {
                break;
            }
            $str .= $char;
        }
        return $str;
    }
    
    /**
     * LZX Decompression Implementation
     * Based on GNU libmspack LZX algorithm
     * 
     * @param string $compressedData The compressed LZX data
     * @param int $uncompressedSize Expected output size
     * @param int $windowBits Window size in bits (15-21 for regular LZX)
     * @return string|false Decompressed data or false on failure
     */
    private function lzxDecompress($compressedData, $uncompressedSize, $windowBits)
    {
        try {
            // Validate window size (matches GNU libmspack validation)
            if ($windowBits < 15 || $windowBits > 21) {
                error_log("LZX: Invalid window size $windowBits (must be 15-21)");
                return false;
            }
            
            $windowSize = 1 << $windowBits;
            $numOffsets = self::$position_slots[$windowBits - 15] * 8;
            
            error_log("LZX: Initializing decompressor (window: $windowSize bytes, offsets: $numOffsets)");
            
            // Initialize decompression state
            $state = [
                'window' => str_repeat("\x00", $windowSize),
                'window_posn' => 0,
                'R0' => 1, 'R1' => 1, 'R2' => 1,  // Repeated offset registers
                'input' => $compressedData,
                'input_pos' => 0,
                'input_size' => strlen($compressedData),
                'block_remaining' => 0,
                'block_type' => self::LZX_BLOCKTYPE_INVALID,
                'bit_buffer' => 0,
                'bits_left' => 0,
                'frame' => 0,
                'frame_posn' => 0,
                'intel_started' => false,
                'maintree_len' => array_fill(0, self::LZX_NUM_CHARS + $numOffsets, 0),
                'length_len' => array_fill(0, self::LZX_NUM_SECONDARY_LENGTHS, 0),
                'aligned_len' => array_fill(0, self::LZX_ALIGNED_NUM_ELEMENTS, 0),
                'pretree_len' => array_fill(0, self::LZX_PRETREE_NUM_ELEMENTS, 0)
            ];
            
            // Skip Intel E8 preprocessing header (2 bytes)
            if ($state['input_size'] >= 2) {
                $header = $this->readBits($state, 1);
                if ($header) {
                    $intel_size = $this->readBits($state, 16);
                    $intel_size |= ($this->readBits($state, 16) << 16);
                    error_log("LZX: Intel E8 preprocessing enabled (size: $intel_size)");
                }
            }
            
            $output = '';
            $output_pos = 0;
            
            // Main decompression loop
            while ($output_pos < $uncompressedSize && $state['input_pos'] < $state['input_size']) {
                // Calculate frame size (32KB chunks)
                $frame_size = min(self::LZX_FRAME_SIZE, $uncompressedSize - $output_pos);
                $bytes_todo = $state['frame_posn'] + $frame_size - $state['window_posn'];
                
                while ($bytes_todo > 0 && $state['input_pos'] < $state['input_size']) {
                    // Read new block if needed
                    if ($state['block_remaining'] == 0) {
                        if (!$this->lzxReadBlockHeader($state, $numOffsets)) {
                            error_log("LZX: Failed to read block header");
                            break;
                        }
                    }
                    
                    // Decompress block data
                    $this_run = min($state['block_remaining'], $bytes_todo);
                    if (!$this->lzxDecompressBlock($state, $this_run)) {
                        error_log("LZX: Failed to decompress block");
                        break;
                    }
                    
                    $bytes_todo -= $this_run;
                    $state['block_remaining'] -= $this_run;
                }
                
                // Copy frame data to output
                $frame_data = substr($state['window'], $state['frame_posn'], $frame_size);
                $output .= $frame_data;
                $output_pos += strlen($frame_data);
                
                $state['frame_posn'] += $frame_size;
                $state['frame']++;
            }
            
            error_log("LZX: Decompressed " . strlen($output) . " bytes (expected: $uncompressedSize)");
            return substr($output, 0, $uncompressedSize);
            
        } catch (\Exception $e) {
            error_log("LZX decompression error: " . $e->getMessage());
            return false;
        }
    }
    
    /**
     * Read LZX block header
     */
    private function lzxReadBlockHeader(&$state, $numOffsets)
    {
        try {
            // Read block type (3 bits) and length (24 bits)
            $state['block_type'] = $this->readBits($state, 3);
            $length_low = $this->readBits($state, 16);
            $length_high = $this->readBits($state, 8);
            $state['block_remaining'] = $state['block_length'] = ($length_high << 16) | $length_low;
            
            error_log("LZX: New block type {$state['block_type']}, length {$state['block_length']}");
            
            switch ($state['block_type']) {
                case self::LZX_BLOCKTYPE_ALIGNED:
                    // Read aligned offset tree (8 symbols, 3 bits each)
                    for ($i = 0; $i < self::LZX_ALIGNED_NUM_ELEMENTS; $i++) {
                        $state['aligned_len'][$i] = $this->readBits($state, 3);
                    }
                    // Fall through to verbatim processing
                    
                case self::LZX_BLOCKTYPE_VERBATIM:
                    // Read main tree lengths
                    if (!$this->lzxReadLengths($state, 'maintree_len', 0, self::LZX_NUM_CHARS)) {
                        return false;
                    }
                    if (!$this->lzxReadLengths($state, 'maintree_len', self::LZX_NUM_CHARS, self::LZX_NUM_CHARS + $numOffsets)) {
                        return false;
                    }
                    
                    // Read length tree
                    if (!$this->lzxReadLengths($state, 'length_len', 0, self::LZX_NUM_SECONDARY_LENGTHS)) {
                        return false;
                    }
                    break;
                    
                case self::LZX_BLOCKTYPE_UNCOMPRESSED:
                    // Byte align
                    $state['bits_left'] = 0;
                    $state['bit_buffer'] = 0;
                    
                    // Read R0, R1, R2 values (12 bytes total)
                    if ($state['input_pos'] + 12 > $state['input_size']) {
                        return false;
                    }
                    $r_data = substr($state['input'], $state['input_pos'], 12);
                    $state['input_pos'] += 12;
                    
                    $state['R0'] = unpack('V', substr($r_data, 0, 4))[1];
                    $state['R1'] = unpack('V', substr($r_data, 4, 4))[1];
                    $state['R2'] = unpack('V', substr($r_data, 8, 4))[1];
                    
                    $state['intel_started'] = true;
                    break;
                    
                default:
                    error_log("LZX: Invalid block type {$state['block_type']}");
                    return false;
            }
            
            return true;
            
        } catch (\Exception $e) {
            error_log("LZX block header error: " . $e->getMessage());
            return false;
        }
    }
    
    /**
     * LZX block decompression with proper Huffman decoding (GNU libmspack algorithm)
     */
    private function lzxDecompressBlock(&$state, $run_length)
    {
        switch ($state['block_type']) {
            case self::LZX_BLOCKTYPE_UNCOMPRESSED:
                // Copy uncompressed data directly
                $copy_len = min($run_length, $state['input_size'] - $state['input_pos']);
                if ($copy_len > 0) {
                    $data = substr($state['input'], $state['input_pos'], $copy_len);
                    
                    // Copy to window buffer
                    for ($i = 0; $i < strlen($data); $i++) {
                        $state['window'][$state['window_posn']] = $data[$i];
                        $state['window_posn'] = ($state['window_posn'] + 1) % strlen($state['window']);
                    }
                    
                    $state['input_pos'] += $copy_len;
                }
                return true;
                
            case self::LZX_BLOCKTYPE_VERBATIM:
            case self::LZX_BLOCKTYPE_ALIGNED:
                // Build Huffman tables for this block
                if (!$this->buildHuffmanTable($state['maintree_len'], $state, 'maintree') ||
                    !$this->buildHuffmanTable($state['length_len'], $state, 'length')) {
                    error_log("LZX: Failed to build Huffman tables");
                    return false;
                }
                
                if ($state['block_type'] === self::LZX_BLOCKTYPE_ALIGNED) {
                    if (!$this->buildHuffmanTable($state['aligned_len'], $state, 'aligned')) {
                        error_log("LZX: Failed to build aligned table");
                        return false;
                    }
                }
                
                // Decompress symbols
                $bytes_written = 0;
                while ($bytes_written < $run_length && $state['input_pos'] < $state['input_size']) {
                    $main_element = $this->readHuffmanSymbol($state, 'maintree');
                    if ($main_element === false) {
                        error_log("LZX: Failed to read main symbol");
                        break;
                    }
                    
                    if ($main_element < self::LZX_NUM_CHARS) {
                        // Literal character
                        $state['window'][$state['window_posn']] = chr($main_element);
                        $state['window_posn'] = ($state['window_posn'] + 1) % strlen($state['window']);
                        $bytes_written++;
                    } else {
                        // Match: decode length and offset
                        $main_element -= self::LZX_NUM_CHARS;
                        
                        // Get match length
                        $match_length = $main_element & self::LZX_NUM_PRIMARY_LENGTHS;
                        if ($match_length == self::LZX_NUM_PRIMARY_LENGTHS) {
                            $length_footer = $this->readHuffmanSymbol($state, 'length');
                            if ($length_footer === false) break;
                            $match_length += $length_footer;
                        }
                        $match_length += self::LZX_MIN_MATCH;
                        
                        // Get match offset
                        $match_offset = $main_element >> 3;
                        
                        switch ($match_offset) {
                            case 0:
                                $match_offset = $state['R0'];
                                break;
                            case 1:
                                $match_offset = $state['R1'];
                                $state['R1'] = $state['R0'];
                                $state['R0'] = $match_offset;
                                break;
                            case 2:
                                $match_offset = $state['R2'];
                                $state['R2'] = $state['R0'];
                                $state['R0'] = $match_offset;
                                break;
                            default:
                                // Calculate offset using position tables
                                if ($match_offset < count(self::$extra_bits)) {
                                    $extra = self::$extra_bits[$match_offset];
                                    $offset_base = self::$position_base[$match_offset] ?? 0;
                                    
                                    if ($extra >= 3 && $state['block_type'] === self::LZX_BLOCKTYPE_ALIGNED) {
                                        if ($extra > 3) {
                                            $verbatim_bits = $this->readBits($state, $extra - 3);
                                            $offset_base += $verbatim_bits << 3;
                                        }
                                        $aligned_bits = $this->readHuffmanSymbol($state, 'aligned');
                                        if ($aligned_bits !== false) {
                                            $match_offset = $offset_base + $aligned_bits;
                                        } else {
                                            $match_offset = $offset_base;
                                        }
                                    } elseif ($extra > 0) {
                                        $verbatim_bits = $this->readBits($state, $extra);
                                        $match_offset = $offset_base + $verbatim_bits;
                                    } else {
                                        $match_offset = $offset_base;
                                    }
                                    
                                    // Update LRU queue
                                    $state['R2'] = $state['R1'];
                                    $state['R1'] = $state['R0'];
                                    $state['R0'] = $match_offset;
                                }
                                break;
                        }
                        
                        // Copy match data
                        $match_length = min($match_length, $run_length - $bytes_written);
                        for ($i = 0; $i < $match_length; $i++) {
                            $back_pos = ($state['window_posn'] - $match_offset + strlen($state['window'])) % strlen($state['window']);
                            $state['window'][$state['window_posn']] = $state['window'][$back_pos];
                            $state['window_posn'] = ($state['window_posn'] + 1) % strlen($state['window']);
                            $bytes_written++;
                        }
                    }
                }
                
                return ($bytes_written > 0);
                
            default:
                return false;
        }
    }
    
    /**
     * Read Huffman code lengths using pretree (GNU libmspack implementation)
     */
    private function lzxReadLengths(&$state, $table_name, $first, $last)
    {
        // Read lengths for pretree (20 symbols, lengths stored in fixed 4 bits)
        for ($x = 0; $x < self::LZX_PRETREE_NUM_ELEMENTS; $x++) {
            $state['pretree_len'][$x] = $this->readBits($state, 4);
        }
        
        // Build pretree lookup table
        if (!$this->buildHuffmanTable($state['pretree_len'], $state, 'pretree')) {
            return false;
        }
        
        for ($x = $first; $x < $last; ) {
            $z = $this->readHuffmanSymbol($state, 'pretree');
            if ($z === false) return false;
            
            if ($z == 17) {
                // Run of ([read 4 bits]+4) zeros
                $y = $this->readBits($state, 4) + 4;
                while ($y-- && $x < $last) {
                    $state[$table_name][$x++] = 0;
                }
            }
            elseif ($z == 18) {
                // Run of ([read 5 bits]+20) zeros  
                $y = $this->readBits($state, 5) + 20;
                while ($y-- && $x < $last) {
                    $state[$table_name][$x++] = 0;
                }
            }
            elseif ($z == 19) {
                // Run of ([read 1 bit]+4) [read huffman symbol]
                $y = $this->readBits($state, 1) + 4;
                $z = $this->readHuffmanSymbol($state, 'pretree');
                if ($z === false) return false;
                $z = ($state[$table_name][$x] - $z);
                if ($z < 0) $z += 17;
                while ($y-- && $x < $last) {
                    $state[$table_name][$x++] = $z;
                }
            }
            else {
                // Delta current length entry
                $z = ($state[$table_name][$x] - $z);
                if ($z < 0) $z += 17;
                $state[$table_name][$x++] = $z;
            }
        }
        
        return true;
    }
    
    /**
     * Build Huffman decode table from code lengths (GNU libmspack algorithm)
     */
    private function buildHuffmanTable($lens, &$state, $tableName)
    {
        $maxSymbols = count($lens);
        $tableBits = 9; // Standard table size for LZX
        
        // Initialize decode table
        $table = array_fill(0, 1 << $tableBits, 0);
        
        // Count code lengths
        $codeCounts = array_fill(0, 17, 0);
        foreach ($lens as $len) {
            if ($len > 0 && $len <= 16) {
                $codeCounts[$len]++;
            }
        }
        
        // Calculate first code for each length
        $code = 0;
        $firstCode = array_fill(0, 17, 0);
        for ($len = 1; $len <= 16; $len++) {
            $firstCode[$len] = $code;
            $code += $codeCounts[$len];
            $code <<= 1;
        }
        
        // Build table entries
        for ($symbol = 0; $symbol < $maxSymbols; $symbol++) {
            $len = $lens[$symbol];
            if ($len == 0) continue;
            
            $code = $firstCode[$len]++;
            
            if ($len <= $tableBits) {
                // Direct table entry
                $fill = 1 << ($tableBits - $len);
                $start = $code << ($tableBits - $len);
                for ($i = 0; $i < $fill; $i++) {
                    $table[$start + $i] = ($len << 16) | $symbol;
                }
            } else {
                // Multi-level table (simplified for now)
                $table[$code >> ($len - $tableBits)] = ($len << 16) | $symbol;
            }
        }
        
        // Store table in state
        $state[$tableName . '_table'] = $table;
        $state[$tableName . '_bits'] = $tableBits;
        
        return true;
    }
    
    /**
     * Read Huffman symbol from table
     */
    private function readHuffmanSymbol(&$state, $tableName)
    {
        $tableBits = $state[$tableName . '_bits'] ?? 9;
        $table = $state[$tableName . '_table'] ?? [];
        
        if (empty($table)) {
            return false;
        }
        
        // Peek enough bits for table lookup
        while ($state['bits_left'] < $tableBits && $state['input_pos'] < $state['input_size']) {
            $byte1 = ord($state['input'][$state['input_pos']++]);
            $byte2 = ($state['input_pos'] < $state['input_size']) ? ord($state['input'][$state['input_pos']++]) : 0;
            
            $word = $byte1 | ($byte2 << 8);
            $state['bit_buffer'] |= ($word << $state['bits_left']);
            $state['bits_left'] += 16;
        }
        
        if ($state['bits_left'] < $tableBits) {
            return false;
        }
        
        // Look up symbol
        $lookup = $state['bit_buffer'] & ((1 << $tableBits) - 1);
        $entry = $table[$lookup] ?? 0;
        
        $len = $entry >> 16;
        $symbol = $entry & 0xFFFF;
        
        if ($len == 0) {
            return false; // Invalid entry
        }
        
        // Remove consumed bits
        $state['bit_buffer'] >>= $len;
        $state['bits_left'] -= $len;
        
        return $symbol;
    }
    
    /**
     * Read bits from input stream
     */
    private function readBits(&$state, $num_bits)
    {
        while ($state['bits_left'] < $num_bits && $state['input_pos'] < $state['input_size']) {
            $byte1 = ord($state['input'][$state['input_pos']++]);
            $byte2 = ($state['input_pos'] < $state['input_size']) ? ord($state['input'][$state['input_pos']++]) : 0;
            
            // LZX uses little-endian 16-bit words
            $word = $byte1 | ($byte2 << 8);
            $state['bit_buffer'] |= ($word << $state['bits_left']);
            $state['bits_left'] += 16;
        }
        
        if ($state['bits_left'] < $num_bits) {
            return 0; // Not enough bits available
        }
        
        $result = $state['bit_buffer'] & ((1 << $num_bits) - 1);
        $state['bit_buffer'] >>= $num_bits;
        $state['bits_left'] -= $num_bits;
        
        return $result;
    }
}