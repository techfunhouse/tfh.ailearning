# Thumbnail Regeneration Script

This script allows you to regenerate thumbnails for specific references by providing their IDs in a text file.

## Usage

```bash
node scripts/regenerate-thumbnails.js [ids-file] [server-url]
```

### Arguments

- `ids-file` (optional): Path to text file containing reference IDs (default: `reference-ids.txt`)
- `server-url` (optional): Base URL of the server (default: `http://localhost:5002`)

### Examples

```bash
# Using default file and server
node scripts/regenerate-thumbnails.js

# Specify custom file
node scripts/regenerate-thumbnails.js my-references.txt

# Specify both file and server URL
node scripts/regenerate-thumbnails.js my-references.txt http://localhost:3000
```

## File Format

The IDs file should contain one reference ID per line:

```
e076fd42-240c-48f5-a4f9-f071f2f14b2c
0f8f5b54-a751-423c-8a42-78731c549dc4
abc123def456
```

## Requirements

1. **Server must be running**: The application server must be started before running the script
2. **Valid reference IDs**: All IDs in the file must exist in the database
3. **File permissions**: The script needs read access to the IDs file

## Getting Reference IDs

You can get reference IDs from the database in several ways:

### Method 1: Using API (requires jq)
```bash
curl -s http://localhost:5002/api/references | jq -r '.[].id' > reference-ids.txt
```

### Method 2: Using the web interface
1. Open the application in your browser
2. Use browser developer tools to inspect reference elements
3. Copy the reference IDs from the data attributes

### Method 3: Filter by category
```bash
curl -s "http://localhost:5002/api/references?category=AI%20%26%20Machine%20Learning" | jq -r '.[].id' > ai-references.txt
```

## Output

The script provides detailed progress information:

```
🔄 Thumbnail Regeneration Script
================================
📁 Reading IDs from: reference-ids.txt
🌐 Server URL: http://localhost:5002

📖 Reading reference IDs...
✅ Found 2 reference ID(s)

�� Authenticating...
✅ Authentication successful

[1/2] Processing reference: e076fd42-240c-48f5-a4f9-f071f2f14b2c
   📝 Title: Canva
   🔗 URL: https://www.canva.com
   🔄 Regenerating thumbnail...
   ✅ Thumbnail regeneration initiated

📊 Summary
=========
✅ Successful: 2
❌ Errors: 0
📊 Total: 2
```

## Error Handling

The script handles various error conditions:

- **File not found**: Clear error message if the IDs file doesn't exist
- **Server unavailable**: Connection error if server isn't running
- **Reference not found**: Warning for non-existent reference IDs
- **Network issues**: Timeout and connection error handling

## Background Processing

Thumbnail generation runs in the background after the script completes. You can monitor progress by:

1. **Server logs**: Check the console output where the server is running
2. **File system**: Watch the `client/public/thumbnails/` directory for new files
3. **Web interface**: Refresh the application to see updated thumbnails

## Troubleshooting

### "File not found" error
- Check that the file path is correct
- Ensure the file exists and is readable

### "Cannot connect to server" error
- Verify the server is running
- Check the server URL is correct
- Ensure no firewall is blocking the connection

### "Reference not found" warnings
- Verify the reference IDs are correct
- Check that references haven't been deleted
- Ensure no extra whitespace in the IDs file

### Thumbnails not updating
- Check server logs for generation errors
- Verify the thumbnails directory has write permissions
- Some complex websites may fail screenshot generation

## Advanced Usage

### Batch processing with categories
```bash
# Get all AI references
curl -s "http://localhost:5002/api/references?category=AI%20%26%20Machine%20Learning" | jq -r '.[].id' > ai-refs.txt
node scripts/regenerate-thumbnails.js ai-refs.txt

# Get all references with a specific tag
curl -s "http://localhost:5002/api/references?tag=conference" | jq -r '.[].id' > conference-refs.txt
node scripts/regenerate-thumbnails.js conference-refs.txt
```

### Error logging
```bash
node scripts/regenerate-thumbnails.js reference-ids.txt 2>&1 | tee regeneration.log
```

## Technical Details

- Uses high-quality 640x360 resolution thumbnails
- Employs multiple browser strategies (Playwright/Puppeteer) for robust screenshot capture
- Includes progressive fallback for complex websites
- Failed thumbnails show "Screenshot Unavailable" message
- JPEG compression with 85% quality for optimal file size