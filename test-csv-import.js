// Test script to verify CSV import functionality
const fs = require('fs');
const path = require('path');

// Create a test CSV file
const csvContent = `Name,Email,Location,Trainer Email,Package Type,Package Name,Total Sessions,Remaining Sessions,Total Value,Session Value,Expiry Date
John Doe,john.doe@test.com,Wood Square,trainer1@gym.com,PT,10 Session Package,10,8,1000,100,2025-12-31
Jane Smith,jane.smith@test.com,Wood Square,trainer2@gym.com,Group,Group Training Monthly,12,10,360,30,2025-12-31
Mike Johnson,mike.j@test.com,Wood Square,,Custom,Custom Training Plan,15,15,1500,100,2026-01-31
Sarah Williams,sarah.w@test.com,Wood Square,trainer1@gym.com,PT,20 Session Package,20,18,1800,90,`;

const testFilePath = path.join(__dirname, 'test-import.csv');
fs.writeFileSync(testFilePath, csvContent);

console.log('Test CSV file created at:', testFilePath);
console.log('\nCSV Content:');
console.log('==============');
console.log(csvContent);
console.log('\nFeatures tested:');
console.log('- Multiple package types (PT, Group, Custom)');
console.log('- Optional trainer email (Mike Johnson has none)');
console.log('- Optional expiry date (Sarah Williams has none)');
console.log('- Different session values');
console.log('- Different remaining sessions');
console.log('\nYou can now test the import by:');
console.log('1. Going to /clients page');
console.log('2. Clicking "Import CSV" button');
console.log('3. Uploading test-import.csv');
console.log('4. Validating and importing the data');