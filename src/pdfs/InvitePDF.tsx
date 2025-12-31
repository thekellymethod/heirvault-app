// src/pdfs/InvitePDF.tsx
// Invite PDF for client upload instructions

import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  Image,
} from "@react-pdf/renderer";

const styles = StyleSheet.create({
  page: {
    paddingTop: 30,
    paddingBottom: 30,
    paddingHorizontal: 40,
    fontSize: 10,
    fontFamily: "Helvetica",
    backgroundColor: "#FFFFFF",
  },
  header: {
    marginBottom: 20,
    borderBottomWidth: 2,
    borderBottomColor: "#C8942D",
    paddingBottom: 10,
  },
  title: {
    fontSize: 18,
    fontWeight: 700,
    color: "#111C33",
    marginBottom: 4,
    textAlign: "center",
  },
  subtitle: {
    fontSize: 10,
    marginTop: 4,
    color: "#6B7280",
    textAlign: "center",
  },
  section: {
    marginTop: 16,
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: 700,
    color: "#111C33",
    marginBottom: 8,
    borderLeftWidth: 3,
    borderLeftColor: "#C8942D",
    paddingLeft: 8,
  },
  paragraph: {
    fontSize: 9,
    color: "#253246",
    lineHeight: 1.5,
    marginBottom: 6,
  },
  listItem: {
    fontSize: 9,
    color: "#253246",
    lineHeight: 1.5,
    marginBottom: 4,
    paddingLeft: 12,
  },
  qrSection: {
    marginTop: 20,
    marginBottom: 20,
    padding: 16,
    backgroundColor: "#F7F9FC",
    borderWidth: 1,
    borderColor: "#D9E2EE",
    borderRadius: 4,
    alignItems: "center",
  },
  qrCode: {
    width: 150,
    height: 150,
    marginBottom: 10,
  },
  inviteCode: {
    fontSize: 14,
    fontWeight: 700,
    color: "#C8942D",
    marginTop: 8,
    fontFamily: "Courier",
    letterSpacing: 2,
  },
  securityNotice: {
    marginTop: 20,
    padding: 12,
    backgroundColor: "#FEF3C7",
    borderWidth: 1,
    borderColor: "#FCD34D",
    borderRadius: 4,
    fontSize: 8,
    color: "#92400E",
  },
  footer: {
    marginTop: 30,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: "#D9E2EE",
    fontSize: 7,
    color: "#6B7280",
    textAlign: "center",
  },
});

interface InvitePDFProps {
  clientName: string;
  firmName?: string;
  inviteCode: string;
  uploadUrl: string;
  qrCodeDataUrl?: string;
  expiresAt: Date;
}

export function InvitePDF({
  clientName,
  firmName,
  inviteCode,
  uploadUrl,
  qrCodeDataUrl,
  expiresAt,
}: InvitePDFProps) {
  return (
    <Document>
      <Page size="LETTER" style={styles.page}>
        <View style={styles.header}>
          <Text style={styles.title}>Life Insurance Registry Invitation</Text>
          <Text style={styles.subtitle}>
            {firmName ? `From: ${firmName}` : "HeirVault Secure Registry"}
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.paragraph}>
            Dear {clientName},
          </Text>
          <Text style={styles.paragraph}>
            Your attorney has invited you to securely register your life insurance
            policy information in the HeirVault private registry. This registry helps
            ensure your beneficiaries can locate your policies when needed.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>What to Upload</Text>
          <Text style={styles.listItem}>
            • Driver&apos;s License or Passport (government-issued ID)
          </Text>
          <Text style={styles.listItem}>
            • Life Insurance Policy Documents
          </Text>
          <Text style={styles.listItem}>
            • Beneficiary Information (names and relationships)
          </Text>
          <Text style={styles.listItem}>
            • Tax Documents (if required by your attorney)
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>How to Upload</Text>
          <Text style={styles.paragraph}>
            You can access the secure upload portal using either method below:
          </Text>
        </View>

        {qrCodeDataUrl && (
          <View style={styles.qrSection}>
            <Text style={styles.sectionTitle}>Option 1: Scan QR Code</Text>
            <Image src={qrCodeDataUrl} style={styles.qrCode} alt="QR Code" />
            <Text style={styles.paragraph}>
              Scan this QR code with your phone camera to access the upload portal.
            </Text>
          </View>
        )}

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Option 2: Use Invite Code</Text>
          <Text style={styles.inviteCode}>{inviteCode}</Text>
          <Text style={styles.paragraph}>
            Visit: {uploadUrl}
          </Text>
          <Text style={styles.paragraph}>
            Enter the code above when prompted.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Important Information</Text>
          <Text style={styles.paragraph}>
            • This invitation expires on {expiresAt.toLocaleDateString()}
          </Text>
          <Text style={styles.paragraph}>
            • All documents are encrypted and stored securely
          </Text>
          <Text style={styles.paragraph}>
            • Only authorized attorneys can access your information
          </Text>
          <Text style={styles.paragraph}>
            • You will receive a confirmation receipt after submission
          </Text>
        </View>

        <View style={styles.securityNotice}>
          <Text style={styles.sectionTitle}>Security Notice</Text>
          <Text style={styles.paragraph}>
            This invitation link is unique to you. Do not share it with anyone.
            If you have questions or concerns, contact your attorney directly.
            Never provide this code or upload documents through unverified channels.
          </Text>
        </View>

        <View style={styles.footer}>
          <Text>
            This is an automated invitation from HeirVault.{" "}
            {firmName ? `Your attorney firm: ${firmName}` : ""}
          </Text>
          <Text style={{ marginTop: 4 }}>
            Generated on {new Date().toLocaleDateString()} at{" "}
            {new Date().toLocaleTimeString()}
          </Text>
        </View>
      </Page>
    </Document>
  );
}

