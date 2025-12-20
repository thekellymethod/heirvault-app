// src/app/api/inngest/route.ts
import { serve } from "inngest/next";
import { inngest } from "../../../inngest/client";
import fnA from "../../../inngest/fnA"; // Your own functions

export const { GET, POST, PUT } = serve({
  client: inngest,
  functions: [fnA],
});