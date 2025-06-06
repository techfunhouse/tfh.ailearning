// Manual update script to fix the existing reference
import fs from 'fs';

// Read the current references
const referencesData = JSON.parse(fs.readFileSync('client/public/data/references.json', 'utf8'));

// Update the reference with completed thumbnail
if (referencesData.references.length > 0) {
  const ref = referencesData.references[0];
  if (ref.id === '9139b9f1-ffbc-41e2-a4f1-74fd5c35cd73') {
    ref.thumbnail = '/thumbnails/fe8689bb-a4ef-465b-ac75-14c2053beae4.jpg';
    ref.thumbnailStatus = 'completed';
    ref.updatedAt = new Date().toISOString();
    
    // Write back to file
    fs.writeFileSync('client/public/data/references.json', JSON.stringify(referencesData, null, 2));
    console.log('Updated reference with completed thumbnail');
  }
}