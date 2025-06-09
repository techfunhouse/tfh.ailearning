# Scripts Documentation

This directory contains utility scripts for managing the AI Learning Resources application.

## Available Scripts

### 1. Import References (`import-references.js`)

Imports references from a CSV file into the application.

**Usage:**
```bash
node scripts/import-references.js path/to/references.csv [baseUrl] [username] [password]
```

**Parameters:**
- `csvFilePath` - Path to the CSV file containing references
- `baseUrl` - Server URL (default: http://localhost:5000)
- `username` - Admin username (default: admin)
- `password` - Admin password (default: admin123)

**CSV Format:**
```csv
title,link,category,description,tags
"Example Title","https://example.com","Technology","Description here","tag1,tag2,tag3"
```

**Features:**
- Validates URLs and creates categories/tags as needed
- Skips duplicate references based on URL
- Provides detailed import progress and summary
- Handles authentication automatically

### 2. Regenerate Specific Thumbnails (`regenerate-thumbnails.js`)

Regenerates thumbnails for specific references by ID.

**Usage:**
```bash
node scripts/regenerate-thumbnails.js reference-ids.txt [baseUrl] [username] [password]
```

**Parameters:**
- `idsFilePath` - Path to text file containing reference IDs (one per line)
- `baseUrl` - Server URL (default: http://localhost:5000)
- `username` - Admin username (default: admin)
- `password` - Admin password (default: admin123)

**ID File Format:**
```
e076fd42-240c-48f5-a4f9-f071f2f14b2c
0f8f5b54-a751-423c-8a42-78731c549dc4
b6879dcf-b2e4-4f66-9cde-adecef6fb300
```

### 3. Regenerate All Thumbnails (`regenerate-all-thumbnails.js`)

Regenerates thumbnails for all references in the system.

**Usage:**
```bash
node scripts/regenerate-all-thumbnails.js [baseUrl] [username] [password] [delayMs]
```

**Parameters:**
- `baseUrl` - Server URL (default: http://localhost:5000)
- `username` - Admin username (default: admin)
- `password` - Admin password (default: admin123)
- `delayMs` - Delay between requests in milliseconds (default: 2000)

**Features:**
- Processes all references automatically
- Configurable delay to avoid server overload
- Comprehensive progress reporting
- Saves detailed results to timestamped JSON file
- Shows success/failure summary

**Example:**
```bash
# Regenerate all thumbnails with default settings
node scripts/regenerate-all-thumbnails.js

# Regenerate with faster processing (1 second delay)
node scripts/regenerate-all-thumbnails.js http://localhost:5000 admin admin123 1000

# Show help
node scripts/regenerate-all-thumbnails.js --help
```

## Thumbnail System

The application uses a Chrome DevTools Protocol (CDP) based thumbnail system that:

- Captures high-quality 1024×768 screenshots
- Handles complex websites including YouTube and LinkedIn
- Removes overlays and sign-in modals automatically
- Uses reference IDs as filenames for consistency
- Provides fallback mechanisms for difficult sites

## Authentication

All scripts require admin authentication. Default credentials:
- Username: `admin`
- Password: `admin123`

Make sure the application server is running before executing any scripts.

## Output Files

Scripts generate output files in the `scripts/` directory:
- `thumbnail-regeneration-[timestamp].json` - Detailed regeneration results
- Import scripts log to console with progress updates

## Error Handling

All scripts include comprehensive error handling:
- Network timeout handling
- Authentication failure detection
- Invalid URL validation
- Detailed error reporting
- Graceful continuation on individual failures

## Performance Considerations

- Use appropriate delays between requests to avoid overwhelming the server
- Thumbnail generation is CPU-intensive; monitor system resources
- Large batch operations may take significant time to complete
- The CDP system shares Chrome instances for efficiency

## Troubleshooting

**Common Issues:**

1. **Authentication Failed**
   - Verify server is running
   - Check admin credentials
   - Ensure proper network connectivity

2. **Thumbnail Generation Fails**
   - Some websites may block automated access
   - Network timeouts can occur for slow sites
   - Chrome may need additional permissions in some environments

3. **Import Errors**
   - Verify CSV format matches expected structure
   - Check for URL validation errors
   - Ensure proper encoding (UTF-8) for special characters

**Getting Help:**
```bash
node scripts/[script-name].js --help
```