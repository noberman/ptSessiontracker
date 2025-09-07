# Client Import Guide for Managers

## Overview
This guide helps Club Managers and PT Managers prepare and import client data into PT Tracker for the October 2024 launch.

## CSV File Format

### Required Columns (exact names, case-insensitive):
- **Name** - Client's full name
- **Email** - Client's email (MUST be unique - this is how we identify clients)
- **Location** - Must match your location name exactly (e.g., "Wood Square", "888 Plaza")
- **Trainer Email** - Primary trainer's email (optional - can be assigned during import)
- **Remaining Sessions** - Number of unused sessions in their current package
- **Package Size** - Total sessions in the package when purchased
- **Package Total Value** - Total amount paid for the package

### Example CSV:
```csv
Name,Email,Location,Trainer Email,Remaining Sessions,Package Size,Package Total Value
John Smith,john.smith@gmail.com,Wood Square,emily.trainer@gym.com,12,24,2160
Sarah Johnson,sarah.j@email.com,Wood Square,,8,12,1200
Mike Wilson,mike.w@gmail.com,Wood Square,james.trainer@gym.com,15,36,2880
```

## Step-by-Step Import Process

### 1. Prepare Your Data
- Export current client data from your existing system
- Format into CSV with the required columns above
- Ensure emails are unique and correct (clients will receive validation emails)
- Location must match your assigned location exactly

### 2. Access Import Tool
1. Log in to PT Tracker
2. Navigate to **Clients** from the sidebar
3. Click **Import CSV** button (top right)

### 3. Upload and Validate
1. Click "Choose File" and select your CSV
2. Click "Validate CSV" to check for errors
3. Review the validation results:
   - ✅ **Valid rows** - Ready to import
   - ⚠️ **Warnings** - Will import but need attention (e.g., missing trainer)
   - ❌ **Errors** - Must be fixed before import

### 4. Assign Trainers (if needed)
- For clients without trainers or unrecognized trainer emails
- Use the dropdown to assign trainers individually
- Or leave unassigned to assign later

### 5. Complete Import
1. Review the summary showing:
   - New clients to create
   - Existing clients to update (matched by email)
   - Total packages to create
2. Click "Import All Valid Rows"
3. Download the import report for your records

## Important Notes

### For Club Managers:
- You can ONLY import clients to your assigned location
- You can ONLY assign trainers from your location
- If a location name doesn't match, the import will fail

### Email Matching:
- Emails are case-insensitive (john@email.com = JOHN@EMAIL.COM)
- If a client with the email already exists, we UPDATE their info
- If no client exists with that email, we CREATE a new client

### Package Creation:
- Each import creates a NEW package for the client
- If a client already has active packages, this adds another package
- Packages are named "Migrated [Size]-Pack" (e.g., "Migrated 24-Pack")
- Session value is calculated: Total Value ÷ Package Size

### Data Validation Rules:
- Remaining sessions cannot exceed package size
- Package size must be greater than 0
- Package total value must be greater than 0
- Emails must be valid format

## Common Issues and Solutions

### "Location not found"
- **Issue**: Location name doesn't match exactly
- **Solution**: Check spacing, capitalization (e.g., "Wood Square" not "wood square")
- **Club Managers**: You can only import to your assigned location

### "Trainer email not found"
- **Issue**: Trainer email doesn't match system records
- **Solution**: Leave blank and assign manually during import, or correct the email

### "Duplicate email in CSV"
- **Issue**: Same email appears multiple times
- **Solution**: Combine the client's packages or keep only one row

### "Invalid email format"
- **Issue**: Email is malformed
- **Solution**: Correct to valid format (user@domain.com)

## Best Practices

1. **Test First**: Import a small batch (5-10 clients) to verify everything works
2. **Backup Data**: Keep a copy of your original data
3. **Clean Emails**: Ensure all emails are correct - clients will receive notifications
4. **Verify Trainers**: Check trainer emails match exactly or plan to assign manually
5. **Review Packages**: Ensure remaining sessions and values are accurate

## Support

If you encounter issues:
1. Download the error report from the validation screen
2. Contact your PT Manager or Admin
3. Share the error report and your CSV file (remove sensitive data if sharing externally)

## Launch Checklist

Before October 1st launch:
- [ ] Export all active client data from current system
- [ ] Format into required CSV structure
- [ ] Verify location names match exactly
- [ ] Clean and validate email addresses
- [ ] Import clients in batches if needed
- [ ] Verify all imports successful
- [ ] Assign any missing trainers
- [ ] Communicate login process to trainers