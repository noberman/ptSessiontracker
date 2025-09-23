// Test script to verify CSV import functionality with package name matching
const fs = require('fs');
const path = require('path');

// Create a test CSV file with the new format
const csvContent = `Name,Email,Phone,Location,Trainer Email,Package Name,Total Sessions,Remaining Sessions,Total Value,Session Value,Expiry Date
John Doe,john.doe@test.com,+15551001,Wood Square,trainer1@gym.com,10 Session PT Package,10,8,1000,100,2025-12-31
Jane Smith,jane.smith@test.com,,Wood Square,trainer2@gym.com,Group Training Monthly,12,10,360,30,2025-12-31
Mike Johnson,mike.j@test.com,+15551002,Wood Square,,Custom Training Plan,15,15,1500,100,2026-01-31
Sarah Williams,sarah.w@test.com,,Wood Square,trainer1@gym.com,20 Session PT Package,20,18,1800,90,
Emma Davis,emma.d@test.com,+15551003,Wood Square,trainer3@gym.com,5 Session Starter Pack,5,5,450,90,2025-11-30
Robert Brown,robert.b@test.com,,Wood Square,,Unlimited Monthly,30,25,2400,80,2025-12-15`;

const testFilePath = path.join(__dirname, 'test-import-updated.csv');
fs.writeFileSync(testFilePath, csvContent);

console.log('Test CSV file created at:', testFilePath);
console.log('\nCSV Content Preview:');
console.log('====================');
console.log(csvContent);
console.log('\n📋 Import Behavior:');
console.log('--------------------');
console.log('• Package names will be matched against defined PackageTypes in your organization');
console.log('• If a match is found, the package will be linked to that PackageType');
console.log('• If no match is found, the package will be created as "Custom" type');
console.log('• Phone numbers are optional');
console.log('• Trainer emails are optional (Mike and Robert have none)');
console.log('• Expiry dates are optional (Sarah has none)');
console.log('\n🚀 To test:');
console.log('-----------');
console.log('1. Go to /clients page');
console.log('2. Click "Import CSV" button');
console.log('3. Upload test-import-updated.csv');
console.log('4. Validate and import the data');
console.log('\n💡 Tip: First create PackageTypes in Settings that match the package names');
console.log('   in this CSV to see the automatic linking in action!');