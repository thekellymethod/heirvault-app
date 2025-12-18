# Populate Test Invitation Codes

## Quick Setup

**Run this command to populate the database with test codes:**

```bash
curl -X POST http://localhost:3000/api/test/populate-invites
```

Or visit this URL in your browser (it will make a POST request):
- http://localhost:3000/api/test/populate-invites

## Test Codes Created

After running the command, these codes will be available:

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

## How to Test

1. Run the populate command above
2. Go to: http://localhost:3000/client/invite-code
3. Enter any code: `TEST-CODE-001`, `TEST-CODE-002`, etc.
4. Or directly visit: http://localhost:3000/invite/TEST-CODE-001

