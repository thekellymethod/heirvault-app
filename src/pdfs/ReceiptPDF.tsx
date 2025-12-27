// src/pdfs/ReceiptPDF.tsx
// Receipt PDF for intake submission confirmation

import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
} from "@react-pdf/renderer";

const styles = StyleSheet.create({
  page: {
    paddingTop: 40,
    paddingBottom: 40,
    paddingHorizontal: 40,
    fontSize: 10,
    fontFamily: "Helvetica",
    backgroundColor: "#FFFFFF",
  },
  header: {
    marginBottom: 24,
    borderBottomWidth: 2,
    borderBottomColor: "#C8942D",
    paddingBottom: 12,
  },
  title: {
    fontSize: 20,
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
  receiptNumber: {
    fontSize: 16,
    fontWeight: 700,
    color: "#C8942D",
    textAlign: "center",
    marginTop: 8,
    fontFamily: "Courier",
    letterSpacing: 2,
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
  infoRow: {
    flexDirection: "row",
    marginBottom: 6,
  },
  infoLabel: {
    width: 120,
    fontSize: 9,
    color: "#6B7280",
    fontWeight: 600,
  },
  infoValue: {
    flex: 1,
    fontSize: 9,
    color: "#253246",
  },
  statusBadge: {
    padding: 6,
    borderRadius: 4,
    marginTop: 8,
  },
  statusText: {
    fontSize: 9,
    fontWeight: 600,
  },
  paragraph: {
    fontSize: 9,
    color: "#253246",
    lineHeight: 1.5,
    marginBottom: 6,
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

interface ReceiptPDFProps {
  clientName: string;
  receiptNumber: string;
  submittedAt: Date;
  documentTypes: string[];
  statusSummary: {
    highConfidence: number;
    pendingReview: number;
  };
  firmName?: string;
}

export function ReceiptPDF({
  clientName,
  receiptNumber,
  submittedAt,
  documentTypes,
  statusSummary,
  firmName,
}: ReceiptPDFProps) {
  return (
    <Document>
      <Page size="LETTER" style={styles.page}>
        <View style={styles.header}>
          <Text style={styles.title}>Registration Confirmation</Text>
          <Text style={styles.subtitle}>
            {firmName ? `From: ${firmName}` : "HeirVault Secure Registry"}
          </Text>
          <Text style={styles.receiptNumber}>Receipt #{receiptNumber}</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Client Information</Text>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Name:</Text>
            <Text style={styles.infoValue}>{clientName}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Submitted:</Text>
            <Text style={styles.infoValue}>
              {submittedAt.toLocaleString()}
            </Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Documents Received</Text>
          {documentTypes.map((type, index) => (
            <View key={index} style={styles.infoRow}>
              <Text style={styles.infoValue}>• {type}</Text>
            </View>
          ))}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Status Summary</Text>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>High Confidence:</Text>
            <Text style={styles.infoValue}>{statusSummary.highConfidence}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Pending Review:</Text>
            <Text style={styles.infoValue}>{statusSummary.pendingReview}</Text>
          </View>
        </View>

        <View style={[styles.statusBadge, { backgroundColor: statusSummary.pendingReview > 0 ? "#FEF3C7" : "#D1FAE5" }]}>
          <Text style={[styles.statusText, { color: statusSummary.pendingReview > 0 ? "#92400E" : "#065F46" }]}>
            {statusSummary.pendingReview > 0
              ? "Some documents require review"
              : "All documents processed with high confidence"}
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.paragraph}>
            Your information has been securely received and recorded in the
            HeirVault private registry. This receipt serves as confirmation of
            your submission.
          </Text>
          <Text style={styles.paragraph}>
            Please retain this receipt for your records. If you need to update
            your information, contact your attorney.
          </Text>
        </View>

        <View style={styles.footer}>
          <Text>
            This is an automated receipt from HeirVault.{" "}
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

