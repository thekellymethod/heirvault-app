import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
} from "@react-pdf/renderer";

const styles = StyleSheet.create({
  page: {
    paddingTop: 30,
    paddingBottom: 40,
    paddingHorizontal: 40,
    fontSize: 10,
    fontFamily: "Helvetica",
    backgroundColor: "#FFFFFF",
  },
  header: {
    marginBottom: 20,
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
  sectionTitle: {
    fontSize: 12,
    marginTop: 16,
    marginBottom: 8,
    fontWeight: 700,
    color: "#111C33",
    borderLeftWidth: 3,
    borderLeftColor: "#C8942D",
    paddingLeft: 6,
  },
  fieldRow: {
    flexDirection: "row",
    marginBottom: 4,
    paddingVertical: 2,
  },
  fieldLabel: {
    width: 120,
    color: "#6B7280",
    fontWeight: 600,
  },
  fieldValue: {
    flex: 1,
    color: "#111C33",
  },
  card: {
    borderWidth: 1,
    borderColor: "#D9E2EE",
    borderRadius: 6,
    padding: 10,
    marginBottom: 8,
    backgroundColor: "#F7F9FC",
  },
  auditEntry: {
    borderWidth: 1,
    borderColor: "#D9E2EE",
    borderRadius: 6,
    padding: 8,
    marginBottom: 6,
    backgroundColor: "#FFFFFF",
  },
  footer: {
    position: "absolute",
    bottom: 20,
    left: 40,
    right: 40,
    fontSize: 8,
    color: "#6B7280",
    borderTopWidth: 1,
    borderTopColor: "#D9E2EE",
    paddingTop: 6,
    textAlign: "center",
  },
  hash: {
    fontSize: 7,
    fontFamily: "Courier",
    color: "#6B7280",
    marginTop: 4,
  },
});

interface ReportData {
  client: {
    id: string,
    name: string,
    email: string,
    createdAt: Date | string,
  };
  receipts: Array<{
    receiptNumber: string,
    createdAt: Date | string,
    emailSent: boolean;
    emailSentAt: Date | string | null;
  }>;
  auditLog: Array<{
    action: string,
    message: string,
    actor: string,
    actorEmail: string | null;
    timestamp: Date | string,
  }>;
  generatedAt: Date | string,
}

interface AuditTrailReportPDFProps {
  reportData: ReportData;
}

export function AuditTrailReportPDF({ reportData }: AuditTrailReportPDFProps) {
  const generatedDate = new Date(reportData.generatedAt).toLocaleString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Legal Defensibility Report</Text>
          <Text style={styles.subtitle}>Receipts & Audit Trail</Text>
          <Text style={styles.subtitle}>Generated: {generatedDate}</Text>
        </View>

        {/* Client Information */}
        <Text style={styles.sectionTitle}>Client Information</Text>
        <View style={styles.card}>
          <View style={styles.fieldRow}>
            <Text style={styles.fieldLabel}>Name:</Text>
            <Text style={styles.fieldValue}>{reportData.client.name}</Text>
          </View>
          <View style={styles.fieldRow}>
            <Text style={styles.fieldLabel}>Email:</Text>
            <Text style={styles.fieldValue}>{reportData.client.email}</Text>
          </View>
          <View style={styles.fieldRow}>
            <Text style={styles.fieldLabel}>Client ID:</Text>
            <Text style={styles.fieldValue}>{reportData.client.id}</Text>
          </View>
          <View style={styles.fieldRow}>
            <Text style={styles.fieldLabel}>Registered:</Text>
            <Text style={styles.fieldValue}>
              {new Date(reportData.client.createdAt).toLocaleString()}
            </Text>
          </View>
        </View>

        {/* Receipts Summary */}
        <Text style={styles.sectionTitle}>Receipts ({reportData.receipts.length})</Text>
        {reportData.receipts.map((receipt, index) => (
          <View key={index} style={styles.card}>
            <View style={styles.fieldRow}>
              <Text style={styles.fieldLabel}>Receipt Number:</Text>
              <Text style={styles.fieldValue}>{receipt.receiptNumber}</Text>
            </View>
            <View style={styles.fieldRow}>
              <Text style={styles.fieldLabel}>Generated:</Text>
              <Text style={styles.fieldValue}>
                {new Date(receipt.createdAt).toLocaleString()}
              </Text>
            </View>
            <View style={styles.fieldRow}>
              <Text style={styles.fieldLabel}>Email Sent:</Text>
              <Text style={styles.fieldValue}>
                {receipt.emailSent ? "Yes" : "No"}
                {receipt.emailSentAt && ` (${new Date(receipt.emailSentAt).toLocaleString()})`}
              </Text>
            </View>
          </View>
        ))}

        {/* Audit Trail */}
        <Text style={styles.sectionTitle}>
          Audit Trail ({reportData.auditLog.length} entries)
        </Text>
        {reportData.auditLog.map((entry, index) => (
          <View key={index} style={styles.auditEntry}>
            <View style={styles.fieldRow}>
              <Text style={styles.fieldLabel}>Action:</Text>
              <Text style={styles.fieldValue}>{entry.action.replace(/_/g, " ")}</Text>
            </View>
            <View style={styles.fieldRow}>
              <Text style={styles.fieldLabel}>Message:</Text>
              <Text style={styles.fieldValue}>{entry.message}</Text>
            </View>
            <View style={styles.fieldRow}>
              <Text style={styles.fieldLabel}>Actor:</Text>
              <Text style={styles.fieldValue}>
                {entry.actor}
                {entry.actorEmail && ` (${entry.actorEmail})`}
              </Text>
            </View>
            <View style={styles.fieldRow}>
              <Text style={styles.fieldLabel}>Timestamp:</Text>
              <Text style={styles.fieldValue}>
                {new Date(entry.timestamp).toLocaleString()}
              </Text>
            </View>
          </View>
        ))}

        {/* Footer */}
        <View style={styles.footer}>
          <Text>
            This report provides immutable proof of submission, access, and verification.
            {"\n"}
            Suitable for disputes, compliance audits, and court proceedings.
            {"\n"}
            Generated: {generatedDate}
          </Text>
        </View>
      </Page>
    </Document>
  );
}

