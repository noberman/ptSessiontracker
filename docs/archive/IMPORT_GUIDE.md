# Client Import Guide for FitSync Managers

## Overview
This guide helps Club Managers and PT Managers prepare and import client data into FitSync for the October 2024 launch.

## CSV File Format - SIMPLIFIED!

### Required Columns (exact names, case-insensitive):
- **Name** - Client's full name
- **Email** - Client's email (MUST be unique - this is how we identify clients)
- **Location** - Must match your location name exactly (e.g., "Wood Square", "888 Plaza")
- **Trainer Email** - Primary trainer's email (optional - can be assigned during import)
- **Package Template** - Must match an existing package template name exactly
- **Remaining Sessions** - Number of unused sessions in their current package

### Example CSV:
```csv
Name,Email,Location,Trainer Email,Package Template,Remaining Sessions
John Smith,john.smith@gmail.com,Wood Square,emily.trainer@gym.com,24 Prime PT Sessions,12
Sarah Johnson,sarah.j@email.com,Wood Square,,12 Elite PT Sessions,8
Mike Wilson,mike.w@gmail.com,Wood Square,james.trainer@gym.com,36 Prime PT Sessions,15
```

## Available Package Templates

### Prime Packages
- 12 Prime PT Sessions
- 24 Prime PT Sessions  
- 36 Prime PT Sessions

### Elite Packages
- 12 Elite PT Sessions
- 24 Elite PT Sessions
- 36 Elite PT Sessions

### Transformation Packages
- Transformation Challenge - 12 Credits
- Transformation Challenge - 24 Credits

### Intro Package
- 3 Session Intro Pack

**IMPORTANT**: Package template names must match EXACTLY as shown above!

## Step-by-Step Import Process

### 1. Prepare Your Data
- Export current client data from your existing system
- Format into CSV with the required columns above
- Match package names to the templates listed above
- Ensure emails are unique and correct (clients will receive validation emails)
- Location must match your assigned location exactly

### 2. Access Import Tool
1. Log in to FitSync
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

### Package Template Benefits:
- **Consistent Pricing**: All packages use standardized pricing from templates
- **No Math Errors**: Session values are calculated automatically
- **Simpler Import**: No need to calculate or enter package values

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
- Packages use the exact name from the template
- Session value is calculated automatically from the template

### Data Validation Rules:
- Remaining sessions cannot exceed the template's total sessions
- Package template name must match exactly
- Emails must be valid format

## Common Issues and Solutions

### "Location not found"
- **Issue**: Location name doesn't match exactly
- **Solution**: Check spacing, capitalization (e.g., "Wood Square" not "wood square")
- **Club Managers**: You can only import to your assigned location

### "Package template not found"
- **Issue**: Package name doesn't match any template
- **Solution**: Use exact names from the "Available Package Templates" list above
- **Example**: Use "24 Prime PT Sessions" not "24 Sessions" or "Prime 24"

### "Trainer email not found"
- **Issue**: Trainer email doesn't match system records
- **Solution**: Leave blank and assign manually during import, or correct the email

### "Remaining sessions exceeds package size"
- **Issue**: Client has more sessions remaining than the package template allows
- **Solution**: Check the package template size and adjust remaining sessions

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
4. **Verify Package Names**: Double-check package template names match exactly
5. **Verify Trainers**: Check trainer emails match exactly or plan to assign manually
6. **Review Remaining Sessions**: Ensure they don't exceed the package template's total

## Support

If you encounter issues:
1. Download the error report from the validation screen
2. Contact your PT Manager or Admin
3. Share the error report and your CSV file (remove sensitive data if sharing externally)

## Launch Checklist

Before October 1st launch:
- [ ] Export all active client data from current system
- [ ] Format into required CSV structure with template names
- [ ] Verify location names match exactly
- [ ] Clean and validate email addresses
- [ ] Match all packages to available templates
- [ ] Import clients in batches if needed
- [ ] Verify all imports successful
- [ ] Assign any missing trainers
- [ ] Communicate login process to trainers