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
  receiptId: {
    fontSize: 12,
    fontWeight: 700,
    color: "#C8942D",
    textAlign: "center",
    marginTop: 8,
    marginBottom: 4,
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
  policyCard: {
    borderWidth: 1,
    borderColor: "#D9E2EE",
    borderRadius: 6,
    padding: 10,
    marginBottom: 8,
    backgroundColor: "#FFFFFF",
  },
  qrCodeContainer: {
    marginTop: 20,
    padding: 15,
    borderWidth: 1,
    borderColor: "#D9E2EE",
    borderRadius: 6,
    alignItems: "center",
    backgroundColor: "#F7F9FC",
  },
  qrCodeLabel: {
    fontSize: 9,
    color: "#6B7280",
    marginTop: 8,
    textAlign: "center",
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
  successBadge: {
    backgroundColor: "#10B981",
    color: "#FFFFFF",
    padding: 4,
    borderRadius: 4,
    fontSize: 9,
    fontWeight: 700,
    textAlign: "center",
    marginBottom: 12,
  },
});

interface ReceiptData {
  receiptId: string,
  client: {
    firstName: string,
    lastName: string,
    email: string,
    phone: string | null;
    dateOfBirth: Date | null;
  };
  policies: Array<{
    id: string,
    policyNumber: string | null;
    policyType: string | null;
    insurer: {
      name: string,
      contactPhone: string | null;
      contactEmail: string | null;
    };
  }>;
  organization: {
    name: string,
    addressLine1?: string,
    addressLine2?: string,
    city?: string,
    state?: string,
    postalCode?: string,
    phone?: string,
  } | null;
  registeredAt: Date | string,
  receiptGeneratedAt: Date | string,
  updateUrl?: string,
}

interface ClientReceiptPDFProps {
  receiptData: ReceiptData;
}

export function ClientReceiptPDF({ receiptData }: ClientReceiptPDFProps) {
  const fullName = `${receiptData.client.firstName} ${receiptData.client.lastName}`;
  const registeredDate = new Date(receiptData.registeredAt).toLocaleString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
  const generatedDate = new Date(receiptData.receiptGeneratedAt).toLocaleString("en-US", {
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
          <Text style={{ fontSize: 24, fontWeight: 700, color: "#111C33", textAlign: "center", marginBottom: 8 }}>
            HeirVault
          </Text>
          <Text style={styles.title}>Registration Confirmation Receipt</Text>
          <Text style={styles.subtitle}>Life Insurance & Beneficiary Registry</Text>
          <Text style={styles.receiptId}>Receipt ID: {receiptData.receiptId}</Text>
          <View style={styles.successBadge}>
            <Text>✓ REGISTRATION CONFIRMED</Text>
          </View>
        </View>

        {/* Client Details */}
        <Text style={styles.sectionTitle}>Client Information</Text>
        <View style={styles.card}>
          <View style={styles.fieldRow}>
            <Text style={styles.fieldLabel}>Name:</Text>
            <Text style={styles.fieldValue}>{fullName}</Text>
          </View>
          <View style={styles.fieldRow}>
            <Text style={styles.fieldLabel}>Email:</Text>
            <Text style={styles.fieldValue}>{receiptData.client.email}</Text>
          </View>
          {receiptData.client.phone && (
            <View style={styles.fieldRow}>
              <Text style={styles.fieldLabel}>Phone:</Text>
              <Text style={styles.fieldValue}>{receiptData.client.phone}</Text>
            </View>
          )}
          {receiptData.client.dateOfBirth && (
            <View style={styles.fieldRow}>
              <Text style={styles.fieldLabel}>Date of Birth:</Text>
              <Text style={styles.fieldValue}>
                {new Date(receiptData.client.dateOfBirth).toLocaleDateString("en-US", {
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                })}
              </Text>
            </View>
          )}
        </View>

        {/* Policies */}
        {receiptData.policies && receiptData.policies.length > 0 && (
          <>
            <Text style={styles.sectionTitle}>Registered Policies</Text>
            {receiptData.policies.map((policy) => (
              <View key={policy.id} style={styles.policyCard}>
                <View style={styles.fieldRow}>
                  <Text style={styles.fieldLabel}>Insurer:</Text>
                  <Text style={styles.fieldValue}>{policy.insurer.name}</Text>
                </View>
                {policy.policyNumber && (
                  <View style={styles.fieldRow}>
                    <Text style={styles.fieldLabel}>Policy Number:</Text>
                    <Text style={styles.fieldValue}>{policy.policyNumber}</Text>
                  </View>
                )}
                {policy.policyType && (
                  <View style={styles.fieldRow}>
                    <Text style={styles.fieldLabel}>Policy Type:</Text>
                    <Text style={styles.fieldValue}>{policy.policyType}</Text>
                  </View>
                )}
                {policy.insurer.contactPhone && (
                  <View style={styles.fieldRow}>
                    <Text style={styles.fieldLabel}>Insurer Phone:</Text>
                    <Text style={styles.fieldValue}>{policy.insurer.contactPhone}</Text>
                  </View>
                )}
                {policy.insurer.contactEmail && (
                  <View style={styles.fieldRow}>
                    <Text style={styles.fieldLabel}>Insurer Email:</Text>
                    <Text style={styles.fieldValue}>{policy.insurer.contactEmail}</Text>
                  </View>
                )}
              </View>
            ))}
          </>
        )}

        {/* Organization Info */}
        {receiptData.organization && (
          <>
            <Text style={styles.sectionTitle}>Attorney Firm</Text>
            <View style={styles.card}>
              <View style={styles.fieldRow}>
                <Text style={styles.fieldLabel}>Firm Name:</Text>
                <Text style={styles.fieldValue}>{receiptData.organization.name}</Text>
              </View>
              {receiptData.organization.phone && (
                <View style={styles.fieldRow}>
                  <Text style={styles.fieldLabel}>Phone:</Text>
                  <Text style={styles.fieldValue}>{receiptData.organization.phone}</Text>
                </View>
              )}
              {(receiptData.organization.addressLine1 ||
                receiptData.organization.city ||
                receiptData.organization.state) && (
                <View style={styles.fieldRow}>
                  <Text style={styles.fieldLabel}>Address:</Text>
                  <Text style={styles.fieldValue}>
                    {[
                      receiptData.organization.addressLine1,
                      receiptData.organization.addressLine2,
                      receiptData.organization.city,
                      receiptData.organization.state,
                      receiptData.organization.postalCode,
                    ]
                      .filter(Boolean)
                      .join(", ")}
                  </Text>
                </View>
              )}
            </View>
          </>
        )}

        {/* Registration Date */}
        <View style={styles.card}>
          <View style={styles.fieldRow}>
            <Text style={styles.fieldLabel}>Registered At:</Text>
            <Text style={styles.fieldValue}>{registeredDate}</Text>
          </View>
          <View style={styles.fieldRow}>
            <Text style={styles.fieldLabel}>Receipt Generated:</Text>
            <Text style={styles.fieldValue}>{generatedDate}</Text>
          </View>
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          <Text>
            This receipt confirms your registration in the HeirVault private registry.
            {"\n"}
            Private, voluntary registry • Not affiliated with insurers or regulators
            {"\n"}
            Generated: {generatedDate}
          </Text>
        </View>
      </Page>
    </Document>
  );
}

