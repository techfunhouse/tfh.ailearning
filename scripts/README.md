# CSV Import Script for References

This script allows bulk import of references from a CSV file with automatic thumbnail generation and duplicate detection.

## Usage

```bash
# Navigate to the project root
cd /path/to/your/project

# Run the import script
node scripts/import-references.js scripts/sample-references.csv

# Or specify a custom server URL
node scripts/import-references.js scripts/sample-references.csv http://localhost:5000
```

## CSV Format

The CSV file must contain the following columns:

| Column | Required | Description | Example |
|--------|----------|-------------|---------|
| title | Yes | Reference title | "React Documentation" |
| link | Yes | URL to the resource | "https://react.dev/" |
| description | No | Brief description | "Official React documentation" |
| category | No | Category name (must exist) | "Documentation" |
| tags | No | Semicolon-separated tags | "react;frontend;javascript" |

## Features

- **Duplicate Detection**: Checks existing URLs and skips duplicates
- **URL Validation**: Validates and normalizes URLs
- **Category Validation**: Ensures categories exist in the system
- **Auto Tag Creation**: Creates new tags automatically if they don't exist
- **Progress Reporting**: Shows real-time import progress
- **Error Handling**: Detailed error reporting with line numbers
- **Thumbnail Generation**: Automatically triggers screenshot generation

## Authentication

The script uses session-based authentication:
1. Prompts for admin username and password
2. Authenticates with the server
3. Uses session cookies for all API calls

## Import Process

1. **File Validation**: Checks if CSV file exists and is readable
2. **Authentication**: Login with admin credentials
3. **Data Fetching**: Retrieves existing references, categories, and tags
4. **Row Processing**: For each CSV row:
   - Validates required fields
   - Normalizes URLs
   - Checks for duplicates
   - Creates new tags if needed
   - Creates the reference
   - Triggers thumbnail generation

## Error Handling

The script handles various error conditions:
- Missing or invalid CSV file
- Authentication failures
- Invalid URLs
- Missing required fields
- Server connection issues
- API rate limiting

## Sample CSV

Use `scripts/sample-references.csv` as a template. It contains 15 sample references covering various categories and tags.

## Output

The script provides:
- Real-time progress updates
- Summary statistics
- List of newly created tags
- Detailed error reports

Example output:
```
Starting CSV import process...
Found 15 references to import
Username: admin
Password: 
Authenticating...
Fetching existing data...

Processing imports...

[1/15] Created: React Documentation
[2/15] Created new tag: react
[3/15] Skipping duplicate: GitHub
[4/15] Created: Node.js Official Guide
...

Import Summary:
Successful: 12
Skipped (duplicates): 2
Failed: 1
New tags created: react, frontend, typescript

Import process completed!
```

## Best Practices

1. **Backup Data**: Always backup your references before bulk imports
2. **Test Small Batches**: Start with a few rows to test the process
3. **Validate URLs**: Ensure all URLs are accessible
4. **Check Categories**: Verify category names match existing ones
5. **Tag Format**: Use semicolons to separate multiple tags
6. **Encoding**: Save CSV files in UTF-8 encoding for special characters