// src/lib/textract.ts
import { TextractClient } from "@aws-sdk/client-textract";

export const textract = new TextractClient({
  region: process.env.AWS_REGION!,
});

