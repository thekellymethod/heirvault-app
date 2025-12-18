# OCR/Document Extraction Implementation Guide

The document extraction feature is currently implemented as a placeholder. To enable full OCR functionality, you'll need to integrate one of the following solutions:

## Option 1: Tesseract.js (Client/Server-side OCR)

**Pros:** Free, open-source, works offline
**Cons:** Lower accuracy than cloud services, slower processing

```bash
npm install tesseract.js
```

Then update `src/app/api/documents/extract-policy/route.ts`:

```typescript
import { createWorker } from 'tesseract.js';

// For images
const worker = await createWorker('eng');
const { data: { text } } = await worker.recognize(buffer);
await worker.terminate();

// Parse text to extract policy information
```

## Option 2: pdf-parse (PDF Text Extraction)

**Pros:** Fast, good for PDFs with text layers
**Cons:** Doesn't work for scanned PDFs (images)

```bash
npm install pdf-parse
```

```typescript
import pdfParse from 'pdf-parse';

const pdfData = await pdfParse(buffer);
const text = pdfData.text;
// Parse text to extract information
```

## Option 3: Google Cloud Vision API

**Pros:** High accuracy, handles both PDFs and images
**Cons:** Requires API key, costs per request

```bash
npm install @google-cloud/vision
```

## Option 4: AWS Textract

**Pros:** High accuracy, handles complex documents
**Cons:** Requires AWS account, costs per page

```bash
npm install @aws-sdk/client-textract
```

## Recommended Approach

For production, we recommend:
1. **pdf-parse** for PDFs with text layers (fast, free)
2. **Tesseract.js** or **Google Cloud Vision** for scanned documents/images

## Data Extraction Patterns

Once you have the text, use regex patterns to extract:

- **Policy Number**: Look for patterns like "Policy #", "Policy Number:", "POL-", etc.
- **Client Name**: Look for "Insured:", "Policyholder:", "Name:", etc.
- **Email**: Use email regex pattern
- **Phone**: Use phone number regex patterns
- **Date of Birth**: Look for "DOB:", "Date of Birth:", "Birth Date:", etc.
- **Insurer Name**: Usually at the top of the document or in headers
- **Policy Type**: Look for "Term Life", "Whole Life", "Universal Life", etc.

## Example Implementation Structure

```typescript
function extractPolicyData(text: string) {
  const extracted: any = {};
  
  // Extract policy number
  const policyMatch = text.match(/Policy\s*(?:#|Number|No\.?):\s*([A-Z0-9-]+)/i);
  if (policyMatch) extracted.policyNumber = policyMatch[1];
  
  // Extract name
  const nameMatch = text.match(/(?:Insured|Policyholder|Name):\s*([A-Z][a-z]+)\s+([A-Z][a-z]+)/i);
  if (nameMatch) {
    extracted.firstName = nameMatch[1];
    extracted.lastName = nameMatch[2];
  }
  
  // Extract email
  const emailMatch = text.match(/([a-zA-Z0-9._-]+@[a-zA-Z0-9._-]+\.[a-zA-Z0-9_-]+)/);
  if (emailMatch) extracted.email = emailMatch[1];
  
  // Extract phone
  const phoneMatch = text.match(/(\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4})/);
  if (phoneMatch) extracted.phone = phoneMatch[1];
  
  // Extract date of birth
  const dobMatch = text.match(/(?:DOB|Date of Birth|Birth Date):\s*(\d{1,2}[\/-]\d{1,2}[\/-]\d{2,4})/i);
  if (dobMatch) extracted.dateOfBirth = dobMatch[1];
  
  // Extract insurer name (usually in header or first few lines)
  const lines = text.split('\n').slice(0, 10);
  // Look for common insurer names or patterns
  
  return extracted;
}
```

