/**
 * Example usage of FileUploader component
 * 
 * This file demonstrates how to use the FileUploader component
 * in different contexts (registry pages, policy pages, etc.)
 */

import { FileUploader } from "@/components/FileUploader";

// Example 1: Registry files page
export function RegistryFilesPage({ orgId, registryId }: { orgId: string; registryId: string }) {
  return (
    <div className="max-w-3xl mx-auto p-6">
      <h1 className="text-2xl font-semibold mb-6" style={{ fontFamily: "'Playfair Display', Georgia, serif" }}>
        Registry Files
      </h1>
      
      <FileUploader
        orgId={orgId}
        registryId={registryId}
        category="policies"
        autoLoad={true}
        onUploaded={(item) => {
          console.log("File uploaded:", item);
        }}
      />
    </div>
  );
}

// Example 2: Policy-specific uploads
export function PolicyFilesPage({ 
  orgId, 
  registryId, 
  policyId 
}: { 
  orgId: string; 
  registryId: string; 
  policyId: string;
}) {
  return (
    <div className="max-w-3xl mx-auto p-6">
      <h1 className="text-2xl font-semibold mb-6" style={{ fontFamily: "'Playfair Display', Georgia, serif" }}>
        Policy Documents
      </h1>
      
      <FileUploader
        orgId={orgId}
        registryId={registryId}
        policyId={policyId}
        category="proofs"
        autoLoad={true}
      />
    </div>
  );
}

// Example 3: General uploads (no auto-load)
export function GeneralUploadPage({ orgId }: { orgId: string }) {
  return (
    <div className="max-w-3xl mx-auto p-6">
      <FileUploader
        orgId={orgId}
        category="uploads"
        autoLoad={false}
        onUploaded={(item) => {
          // Handle upload completion
          alert(`Uploaded: ${item.originalName}`);
        }}
      />
    </div>
  );
}
