export const NL_PLAN_SCHEMA = {
  name: "admin_console_plan",
  schema: {
    type: "object",
    additionalProperties: false,
    properties: {
      cmd: { type: ["string", "null"] },
      args: { type: "object", additionalProperties: true },
      next: {
        type: "array",
        items: {
          type: "object",
          additionalProperties: false,
          properties: {
            cmd: { type: "string" },
            args: { type: "object", additionalProperties: true }
          },
          required: ["cmd", "args"]
        }
      },
      requiresConfirm: { type: "boolean" },
      confidence: { type: "number", minimum: 0, maximum: 1 },
      explanation: { type: "string" },
      safetyFlags: {
        type: "array",
        items: { type: "string" }
      }
    },
    required: ["cmd", "args", "next", "requiresConfirm", "confidence", "explanation", "safetyFlags"]
  }
} as const;

