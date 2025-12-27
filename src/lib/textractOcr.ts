// src/lib/textractOcr.ts
import { DetectDocumentTextCommand } from "@aws-sdk/client-textract";
import { textract } from "@/lib/textract";

export async function textractDetectText(fileBytes: Buffer) {
  const cmd = new DetectDocumentTextCommand({
    Document: { Bytes: fileBytes },
  });
  return textract.send(cmd);
}

