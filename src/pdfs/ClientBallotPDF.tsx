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
    paddingTop: 20,
    paddingBottom: 20,
    paddingHorizontal: 30,
    fontSize: 9,
    fontFamily: "Helvetica",
    backgroundColor: "#FFFFFF",
  },
  header: {
    marginBottom: 12,
    borderBottomWidth: 2,
    borderBottomColor: "#C8942D",
    paddingBottom: 8,
  },
  title: {
    fontSize: 16,
    fontWeight: 700,
    color: "#111C33",
    marginBottom: 2,
    textAlign: "center",
  },
  subtitle: {
    fontSize: 8,
    marginTop: 2,
    color: "#6B7280",
    textAlign: "center",
  },
  receiptId: {
    fontSize: 9,
    fontWeight: 700,
    color: "#C8942D",
    textAlign: "center",
    marginTop: 4,
    marginBottom: 2,
  },
  ballotSection: {
    marginTop: 8,
    marginBottom: 6,
  },
  sectionTitle: {
    fontSize: 10,
    fontWeight: 700,
    color: "#111C33",
    marginBottom: 4,
    borderLeftWidth: 2,
    borderLeftColor: "#C8942D",
    paddingLeft: 4,
  },
  boxRow: {
    flexDirection: "row",
    marginBottom: 3,
    alignItems: "center",
  },
  boxLabel: {
    width: 80,
    fontSize: 7,
    color: "#6B7280",
    fontWeight: 600,
  },
  box: {
    flex: 1,
    borderWidth: 1,
    borderColor: "#111C33",
    minHeight: 12,
    padding: 2,
    fontSize: 8,
    color: "#111C33",
  },
  boxEmpty: {
    flex: 1,
    borderWidth: 1,
    borderColor: "#111C33",
    minHeight: 12,
    padding: 2,
    fontSize: 7,
    color: "#9CA3AF",
    fontStyle: "italic",
  },
  instructions: {
    marginTop: 6,
    padding: 6,
    backgroundColor: "#F7F9FC",
    borderWidth: 1,
    borderColor: "#D9E2EE",
    borderRadius: 3,
    fontSize: 7,
    color: "#6B7280",
  },
  instructionTitle: {
    fontSize: 8,
    fontWeight: 700,
    color: "#111C33",
    marginBottom: 3,
  },
  instructionItem: {
    marginBottom: 2,
    paddingLeft: 8,
  },
  qrSection: {
    marginTop: 8,
    padding: 8,
    borderWidth: 1,
    borderColor: "#D9E2EE",
    borderRadius: 3,
    alignItems: "center",
    backgroundColor: "#F7F9FC",
  },
  qrCode: {
    width: 80,
    height: 80,
    marginBottom: 4,
  },
  qrLabel: {
    fontSize: 7,
    color: "#6B7280",
    textAlign: "center",
    marginTop: 2,
  },
  footer: {
    position: "absolute",
    bottom: 15,
    left: 30,
    right: 30,
    fontSize: 7,
    color: "#6B7280",
    borderTopWidth: 1,
    borderTopColor: "#D9E2EE",
    paddingTop: 4,
    textAlign: "center",
  },
  policyBox: {
    marginTop: 4,
    padding: 4,
    borderWidth: 1,
    borderColor: "#D9E2EE",
    borderRadius: 2,
    backgroundColor: "#FFFFFF",
  },
  policyTitle: {
    fontSize: 8,
    fontWeight: 700,
    color: "#111C33",
    marginBottom: 3,
  },
});

interface BallotData {
  receiptId: string;
  client: {
    firstName: string;
    lastName: string;
    email: string;
    phone: string | null;
    dateOfBirth: Date | null;
  };
  policies: Array<{
    id: string;
    policyNumber: string | null;
    policyType: string | null;
    insurer: {
      name: string;
      contactPhone: string | null;
      contactEmail: string | null;
    };
  }>;
  organization: {
    name: string;
    addressLine1?: string;
    addressLine2?: string;
    city?: string;
    state?: string;
    postalCode?: string;
    phone?: string;
  } | null;
  registeredAt: Date | string;
  receiptGeneratedAt: Date | string;
  updateUrl?: string;
  qrCodeDataUrl?: string;
}

interface ClientBallotPDFProps {
  ballotData: BallotData;
}

export function ClientBallotPDF({ ballotData }: ClientBallotPDFProps) {
  const fullName = `${ballotData.client.firstName} ${ballotData.client.lastName}`;
  const registeredDate = new Date(ballotData.registeredAt).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>HeirVault Registry Ballot</Text>
          <Text style={styles.subtitle}>Life Insurance & Beneficiary Registry</Text>
          {ballotData.receiptId.startsWith("INV-") ? (
            <Text style={styles.receiptId}>Invitation Code: {ballotData.receiptId}</Text>
          ) : (
            <Text style={styles.receiptId}>Receipt: {ballotData.receiptId}</Text>
          )}
        </View>

        {/* Client Information Section */}
        <View style={styles.ballotSection}>
          <Text style={styles.sectionTitle}>Client Information</Text>
          <View style={styles.boxRow}>
            <Text style={styles.boxLabel}>Full Name:</Text>
            <View style={styles.box}>
              <Text>{fullName}</Text>
            </View>
          </View>
          <View style={styles.boxRow}>
            <Text style={styles.boxLabel}>Email:</Text>
            <View style={styles.box}>
              <Text>{ballotData.client.email}</Text>
            </View>
          </View>
          <View style={styles.boxRow}>
            <Text style={styles.boxLabel}>Phone:</Text>
            <View style={styles.box}>
              <Text>{ballotData.client.phone || "________________"}</Text>
            </View>
          </View>
          <View style={styles.boxRow}>
            <Text style={styles.boxLabel}>Date of Birth:</Text>
            <View style={styles.box}>
              <Text>
                {ballotData.client.dateOfBirth
                  ? new Date(ballotData.client.dateOfBirth).toLocaleDateString("en-US", {
                      year: "numeric",
                      month: "2-digit",
                      day: "2-digit",
                    })
                  : "________________"}
              </Text>
            </View>
          </View>
        </View>

        {/* Policies Section */}
        {ballotData.policies && ballotData.policies.length > 0 && (
          <View style={styles.ballotSection}>
            <Text style={styles.sectionTitle}>Registered Policies</Text>
            {ballotData.policies.map((policy, idx) => (
              <View key={policy.id} style={styles.policyBox}>
                <Text style={styles.policyTitle}>Policy {idx + 1}</Text>
                <View style={styles.boxRow}>
                  <Text style={styles.boxLabel}>Insurer:</Text>
                  <View style={styles.box}>
                    <Text>{policy.insurer.name}</Text>
                  </View>
                </View>
                <View style={styles.boxRow}>
                  <Text style={styles.boxLabel}>Policy #:</Text>
                  <View style={styles.box}>
                    <Text>{policy.policyNumber || "________________"}</Text>
                  </View>
                </View>
                <View style={styles.boxRow}>
                  <Text style={styles.boxLabel}>Type:</Text>
                  <View style={styles.box}>
                    <Text>{policy.policyType || "________________"}</Text>
                  </View>
                </View>
              </View>
            ))}
          </View>
        )}

        {/* Update Instructions */}
        <View style={styles.instructions}>
          <Text style={styles.instructionTitle}>
            {ballotData.receiptId.startsWith("INV-") ? "Registration Instructions:" : "Update Instructions:"}
          </Text>
          {ballotData.receiptId.startsWith("INV-") ? (
            <>
              <Text style={styles.instructionItem}>
                • Scan the QR code below or visit the invitation URL to access the upload portal
              </Text>
              <Text style={styles.instructionItem}>
                • Upload your policy documents (PDF or image files) - we'll extract the information automatically
              </Text>
              <Text style={styles.instructionItem}>
                • Upload a photo of your government-issued ID (driver's license, passport, etc.)
              </Text>
              <Text style={styles.instructionItem}>
                • Review and confirm the extracted policy information
              </Text>
              <Text style={styles.instructionItem}>
                • Add any additional policies or beneficiary information as needed
              </Text>
            </>
          ) : (
            <>
              <Text style={styles.instructionItem}>
                • To add a new policy: Fill in all policy boxes below
              </Text>
              <Text style={styles.instructionItem}>
                • To change beneficiaries: Fill beneficiary name, relationship, and percentage boxes
              </Text>
              <Text style={styles.instructionItem}>
                • To update policy information: Fill the corresponding policy boxes
              </Text>
              <Text style={styles.instructionItem}>
                • To change contact info: Fill phone or email boxes above
              </Text>
            </>
          )}
        </View>

        {/* Blank Policy Boxes for Updates */}
        <View style={styles.ballotSection}>
          <Text style={styles.sectionTitle}>New Policy Information (if adding)</Text>
          <View style={styles.boxRow}>
            <Text style={styles.boxLabel}>Insurer Name:</Text>
            <View style={styles.boxEmpty}>
              <Text>________________________________</Text>
            </View>
          </View>
          <View style={styles.boxRow}>
            <Text style={styles.boxLabel}>Policy Number:</Text>
            <View style={styles.boxEmpty}>
              <Text>________________________________</Text>
            </View>
          </View>
          <View style={styles.boxRow}>
            <Text style={styles.boxLabel}>Policy Type:</Text>
            <View style={styles.boxEmpty}>
              <Text>________________________________</Text>
            </View>
          </View>
        </View>

        {/* Beneficiary Update Section */}
        <View style={styles.ballotSection}>
          <Text style={styles.sectionTitle}>Beneficiary Changes (if updating)</Text>
          <View style={styles.boxRow}>
            <Text style={styles.boxLabel}>Name:</Text>
            <View style={styles.boxEmpty}>
              <Text>________________________________</Text>
            </View>
          </View>
          <View style={styles.boxRow}>
            <Text style={styles.boxLabel}>Relationship:</Text>
            <View style={styles.boxEmpty}>
              <Text>________________________________</Text>
            </View>
          </View>
          <View style={styles.boxRow}>
            <Text style={styles.boxLabel}>Percentage:</Text>
            <View style={styles.boxEmpty}>
              <Text>________________________________</Text>
            </View>
          </View>
        </View>

        {/* QR Code Section */}
        {ballotData.updateUrl && (
          <View style={styles.qrSection}>
            {ballotData.qrCodeDataUrl ? (
              <Image src={ballotData.qrCodeDataUrl} style={styles.qrCode} />
            ) : (
              <View style={[styles.qrCode, { backgroundColor: "#E5E7EB" }]}>
                <Text style={{ textAlign: "center", paddingTop: 30, fontSize: 7 }}>
                  QR Code
                </Text>
              </View>
            )}
            <Text style={styles.qrLabel}>
              Scan to update your registry information
            </Text>
            {ballotData.updateUrl && (
              <Text style={[styles.qrLabel, { fontSize: 6, marginTop: 2 }]}>
                {ballotData.updateUrl.length > 50
                  ? `${ballotData.updateUrl.substring(0, 47)}...`
                  : ballotData.updateUrl}
              </Text>
            )}
          </View>
        )}

        {/* Organization Info */}
        {ballotData.organization && (
          <View style={styles.ballotSection}>
            <Text style={styles.sectionTitle}>Attorney Firm</Text>
            <View style={styles.boxRow}>
              <Text style={styles.boxLabel}>Firm:</Text>
              <View style={styles.box}>
                <Text>{ballotData.organization.name}</Text>
              </View>
            </View>
            {ballotData.organization.phone && (
              <View style={styles.boxRow}>
                <Text style={styles.boxLabel}>Phone:</Text>
                <View style={styles.box}>
                  <Text>{ballotData.organization.phone}</Text>
                </View>
              </View>
            )}
          </View>
        )}

        {/* Footer */}
        <View style={styles.footer}>
          <Text>
            Registered: {registeredDate} • Private, voluntary registry • Not affiliated with insurers
          </Text>
        </View>
      </Page>
    </Document>
  );
}

