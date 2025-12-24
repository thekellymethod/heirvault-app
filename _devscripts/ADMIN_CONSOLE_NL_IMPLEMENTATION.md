# Admin Console Natural Language Implementation

## ✅ Implementation Complete

The Admin Console now supports **Natural Language Model-driven commands** using OpenAI's Structured Outputs with JSON Schema. The model proposes actions, but your code enforces them.

## Architecture

### Security Model
1. **NLM never executes** - it only proposes `{ cmd, args }` plans
2. **Whitelist only** - model must choose from your command IDs
3. **Structured Outputs** - forces valid JSON matching strict schema
4. **Confirmation gate** - write commands require explicit confirmation
5. **Audit everything** - plan requests and executions are logged
6. **Kill switch** - env vars disable the feature entirely

### Flow
```
User Input (Natural Language)
    ↓
translateNLToPlan() → OpenAI with Structured Outputs
    ↓
Plan: { cmd, args, next, requiresConfirm, confidence, explanation, safetyFlags }
    ↓
User Reviews Plan
    ↓
If requiresConfirm → User confirms
    ↓
executeNLPlan() → Your whitelisted command handler
    ↓
Result (audited)
```

## Files Created/Updated

### Core Implementation
- ✅ `src/lib/admin/nl/schema.ts` - JSON Schema for structured outputs
- ✅ `src/lib/admin/nl/translate.ts` - OpenAI integration with structured outputs
- ✅ `src/app/api/admin/nl/plan/route.ts` - Planning endpoint (returns plan, doesn't execute)
- ✅ `src/app/api/admin/nl/execute/route.ts` - Execution endpoint (whitelisted commands only)

### Existing UI
- ✅ `src/app/admin/console/ConsoleClient.tsx` - Already has NL mode implemented

## Environment Variables

Add to `.env.local` and Vercel:

```env
# Required
OPENAI_API_KEY=sk-...  # Server-side only

# Feature flags
ADMIN_CONSOLE_ENABLED=true
ADMIN_CONSOLE_NL_ENABLED=true

# Optional: require confirmation for write commands
ADMIN_CONSOLE_WRITE_CONFIRM=true
```

## API Endpoints

### POST `/api/admin/nl/plan`
**Purpose**: Translate natural language to a command plan

**Request**:
```json
{
  "text": "Who am I?"
}
```

**Response**:
```json
{
  "ok": true,
  "data": {
    "plan": {
      "cmd": "auth:whoami",
      "args": {},
      "next": [],
      "requiresConfirm": false,
      "confidence": 0.95,
      "explanation": "User wants to see their identity",
      "safetyFlags": []
    },
    "auditId": "..."
  }
}
```

### POST `/api/admin/nl/execute`
**Purpose**: Execute a whitelisted command from a plan

**Request**:
```json
{
  "cmd": "auth:whoami",
  "args": {},
  "confirmed": false
}
```

**Response**:
```json
{
  "ok": true,
  "data": { ... },
  "meta": { "auditId": "..." }
}
```

## Structured Outputs Schema

The model **must** return JSON matching this schema:

```typescript
{
  cmd: string | null,           // Command ID from whitelist
  args: Record<string, any>,    // Command arguments
  next: Array<{                 // Optional follow-up steps
    cmd: string,
    args: Record<string, any>
  }>,
  requiresConfirm: boolean,     // True for write commands
  confidence: number,            // 0-1 confidence score
  explanation: string,           // Why this plan was chosen
  safetyFlags: string[]         // Any safety concerns
}
```

## Write Commands

Commands that modify data require confirmation:
- `attorney:verify`
- `attorney:revoke`

When `ADMIN_CONSOLE_WRITE_CONFIRM=true`, these commands will:
1. Set `requiresConfirm: true` in the plan
2. Require `confirmed: true` in the execute request
3. Return 409 if confirmation is missing

## Testing

### Test Cases

1. **Read Command**:
   ```
   "Who am I?"
   → Plan: cmd="auth:whoami", requiresConfirm=false
   → Execute → Success
   ```

2. **Write Command** (with confirmation):
   ```
   "Verify attorney userId abc123"
   → Plan: cmd="attorney:verify", requiresConfirm=true
   → User confirms
   → Execute with confirmed=true → Success
   ```

3. **Invalid Command**:
   ```
   "Delete all users"
   → Plan: cmd=null, explanation="Command not in whitelist"
   → Cannot execute
   ```

4. **Multi-step Plan**:
   ```
   "Check db health then show migrations"
   → Plan: cmd="db:health", next=[{cmd="migrations:status", args={}}]
   → Execute first, then execute next steps
   ```

## Security Features

### 1. Whitelist Enforcement
- Model can only choose from `COMMANDS` array
- Non-whitelisted commands are blocked with `cmd=null`
- Safety flag: `NON_WHITELIST_CMD`

### 2. Structured Outputs
- JSON Schema enforces valid response structure
- `strict: true` ensures exact schema compliance
- No "almost JSON" or malformed responses

### 3. Confirmation Gates
- Write commands require explicit confirmation
- UI shows confirmation checkbox for `requiresConfirm=true`
- Backend validates `confirmed=true` before execution

### 4. Audit Logging
- Every plan request is logged
- Every execution is logged
- Logs include: cmd, args, confirmed status, actor

### 5. Kill Switches
- `ADMIN_CONSOLE_ENABLED=false` → Disables entire console
- `ADMIN_CONSOLE_NL_ENABLED=false` → Disables NL mode only
- Returns clear error messages when disabled

## Error Handling

### Translation Errors
- Missing API key → `safetyFlags: ["NO_API_KEY"]`
- Translation failure → `safetyFlags: ["TRANSLATION_ERROR"]`
- Non-whitelisted command → `safetyFlags: ["NON_WHITELIST_CMD"]`

### Execution Errors
- Unknown command → 400
- Missing confirmation → 409
- Handler throws → 500 with error details

## Future Enhancements

1. **Add dedicated audit actions**:
   - `ADMIN_CONSOLE_PLAN` (instead of `GLOBAL_POLICY_SEARCH_PERFORMED`)
   - `ADMIN_CONSOLE_NL_EXECUTE`

2. **Upgrade to Responses API** (when available):
   - Currently using `chat.completions.create()` with structured outputs
   - Can migrate to `client.responses.create()` when SDK supports it

3. **Enhanced arg validation**:
   - Add `argsSpec` to command definitions
   - Validate args against schema before execution

4. **Multi-step execution**:
   - Automatically execute `next` steps if all succeed
   - Rollback on failure (if needed)

## Production Checklist

- [ ] Set `OPENAI_API_KEY` in Vercel environment variables
- [ ] Set `ADMIN_CONSOLE_ENABLED=true` (when ready)
- [ ] Set `ADMIN_CONSOLE_NL_ENABLED=true` (when ready)
- [ ] Set `ADMIN_CONSOLE_WRITE_CONFIRM=true` (recommended)
- [ ] Test with read commands first
- [ ] Test with write commands (verify confirmation works)
- [ ] Monitor audit logs for suspicious activity
- [ ] Review OpenAI API usage/costs

## Notes

- The UI (`ConsoleClient.tsx`) already supports NL mode
- The implementation uses OpenAI SDK v6.15.0
- Structured outputs ensure type safety and schema compliance
- All commands go through the same whitelisted handler system
- No direct model execution - all actions are mediated by your code

