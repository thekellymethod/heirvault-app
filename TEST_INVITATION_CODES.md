# Test Invitation Codes

Use these codes to test the client invitation portal at `/client/invite-code`

## Test Codes

1. **TEST-CODE-001**
   - Email: test1@example.com
   - Name: John Doe
   - URL: http://localhost:3000/invite/TEST-CODE-001

2. **TEST-CODE-002**
   - Email: test2@example.com
   - Name: Jane Smith
   - URL: http://localhost:3000/invite/TEST-CODE-002

3. **TEST-CODE-003**
   - Email: test3@example.com
   - Name: Bob Johnson
   - URL: http://localhost:3000/invite/TEST-CODE-003

4. **TEST-CODE-004**
   - Email: test4@example.com
   - Name: Alice Williams
   - URL: http://localhost:3000/invite/TEST-CODE-004

5. **TEST-CODE-005**
   - Email: test5@example.com
   - Name: Charlie Brown
   - URL: http://localhost:3000/invite/TEST-CODE-005

## How to Create These Codes

Run this command to create the test codes in your database:

```bash
npx tsx scripts/create-test-invites.ts
```

Or visit: http://localhost:3000/test/invites and click "Create 5 Test Invites"

## Quick Test

1. Go to: http://localhost:3000/client/invite-code
2. Enter any of the codes above (e.g., `TEST-CODE-001`)
3. Or directly visit: http://localhost:3000/invite/TEST-CODE-001

