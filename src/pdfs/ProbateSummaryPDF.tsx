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
    marginTop: 14,
    marginBottom: 6,
    fontWeight: 700,
    color: "#111C33",
    borderLeftWidth: 3,
    borderLeftColor: "#C8942D",
    paddingLeft: 6,
  },
  fieldRow: {
    flexDirection: "row",
    marginBottom: 3,
    paddingVertical: 2,
  },
  fieldLabel: {
    width: 140,
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
  tableHeader: {
    flexDirection: "row",
    backgroundColor: "#E5E7EB",
    padding: 6,
    marginBottom: 4,
    fontWeight: 700,
    fontSize: 9,
  },
  tableRow: {
    flexDirection: "row",
    padding: 6,
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
  },
  tableCell: {
    flex: 1,
    fontSize: 9,
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
  warning: {
    backgroundColor: "#FEF3C7",
    borderWidth: 1,
    borderColor: "#FCD34D",
    borderRadius: 4,
    padding: 8,
    marginTop: 8,
    marginBottom: 8,
  },
  warningText: {
    fontSize: 9,
    color: "#92400E",
    fontStyle: "italic",
  },
});

interface PolicyWithBeneficiaries {
  id: string;
  insurer: {
    name: string;
    contactPhone: string | null;
    contactEmail: string | null;
  };
  policyNumber: string | null;
  policyType: string | null;
  verificationStatus: string;
  beneficiaries: {
    beneficiary: {
      firstName: string;
      lastName: string;
      relationship: string | null;
      email: string | null;
      phone: string | null;
    };
    sharePercent: number | null;
  }[];
}

interface Beneficiary {
  id: string;
  firstName: string;
  lastName: string;
  relationship: string | null;
  email: string | null;
  phone: string | null;
  dateOfBirth: Date | null;
}

interface ProbateSummaryProps {
  client: {
    firstName: string;
    lastName: string;
    email: string;
    phone: string | null;
    dateOfBirth: Date | null;
    createdAt: Date;
  };
  policies: PolicyWithBeneficiaries[];
  beneficiaries: Beneficiary[];
  firmName?: string;
  generatedAt: Date;
  executorName?: string;
  executorContact?: string;
  caseNumber?: string;
}

export function ProbateSummaryPDF({
  client,
  policies,
  beneficiaries,
  firmName,
  generatedAt,
  executorName,
  executorContact,
  caseNumber,
}: ProbateSummaryProps) {
  const fullName = `${client.firstName} ${client.lastName}`;
  const genDate = generatedAt.toLocaleString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  // Calculate total policies and beneficiaries
  const totalPolicies = policies.length;
  const totalBeneficiaries = beneficiaries.length;
  const verifiedPolicies = policies.filter(
    (p) => p.verificationStatus === "VERIFIED"
  ).length;

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Probate Summary Report</Text>
          <Text style={styles.subtitle}>
            Estate of {fullName} · Generated: {genDate}
          </Text>
          {firmName && <Text style={styles.subtitle}>Prepared by: {firmName}</Text>}
          {caseNumber && (
            <Text style={styles.subtitle}>Case Number: {caseNumber}</Text>
          )}
        </View>

        {/* Executor Information */}
        {(executorName || executorContact) && (
          <>
            <Text style={styles.sectionTitle}>Executor Information</Text>
            {executorName && (
              <View style={styles.fieldRow}>
                <Text style={styles.fieldLabel}>Executor Name:</Text>
                <Text style={styles.fieldValue}>{executorName}</Text>
              </View>
            )}
            {executorContact && (
              <View style={styles.fieldRow}>
                <Text style={styles.fieldLabel}>Contact:</Text>
                <Text style={styles.fieldValue}>{executorContact}</Text>
              </View>
            )}
          </>
        )}

        {/* Decedent Information */}
        <Text style={styles.sectionTitle}>Decedent Information</Text>
        <View style={styles.fieldRow}>
          <Text style={styles.fieldLabel}>Full Name:</Text>
          <Text style={styles.fieldValue}>{fullName}</Text>
        </View>
        {client.dateOfBirth && (
          <View style={styles.fieldRow}>
            <Text style={styles.fieldLabel}>Date of Birth:</Text>
            <Text style={styles.fieldValue}>
              {client.dateOfBirth.toLocaleDateString("en-US", {
                year: "numeric",
                month: "short",
                day: "numeric",
              })}
            </Text>
          </View>
        )}
        <View style={styles.fieldRow}>
          <Text style={styles.fieldLabel}>Email:</Text>
          <Text style={styles.fieldValue}>{client.email}</Text>
        </View>
        {client.phone && (
          <View style={styles.fieldRow}>
            <Text style={styles.fieldLabel}>Phone:</Text>
            <Text style={styles.fieldValue}>{client.phone}</Text>
          </View>
        )}

        {/* Summary Statistics */}
        <Text style={styles.sectionTitle}>Summary</Text>
        <View style={styles.card}>
          <View style={styles.fieldRow}>
            <Text style={styles.fieldLabel}>Total Policies:</Text>
            <Text style={styles.fieldValue}>{totalPolicies}</Text>
          </View>
          <View style={styles.fieldRow}>
            <Text style={styles.fieldLabel}>Verified Policies:</Text>
            <Text style={styles.fieldValue}>{verifiedPolicies}</Text>
          </View>
          <View style={styles.fieldRow}>
            <Text style={styles.fieldLabel}>Total Beneficiaries:</Text>
            <Text style={styles.fieldValue}>{totalBeneficiaries}</Text>
          </View>
        </View>

        {/* Policies Table */}
        <Text style={styles.sectionTitle}>Life Insurance Policies</Text>
        {policies.length === 0 ? (
          <Text style={{ fontStyle: "italic", color: "#6B7280" }}>
            No policies recorded.
          </Text>
        ) : (
          <>
            <View style={styles.tableHeader}>
              <Text style={[styles.tableCell, { flex: 2 }]}>Insurer</Text>
              <Text style={styles.tableCell}>Policy #</Text>
              <Text style={styles.tableCell}>Type</Text>
              <Text style={styles.tableCell}>Status</Text>
            </View>
            {policies.map((policy) => (
              <View key={policy.id} style={styles.card}>
                <View style={styles.tableRow}>
                  <Text style={[styles.tableCell, { flex: 2, fontWeight: 700 }]}>
                    {policy.insurer.name}
                  </Text>
                  <Text style={styles.tableCell}>
                    {policy.policyNumber || "N/A"}
                  </Text>
                  <Text style={styles.tableCell}>
                    {policy.policyType || "N/A"}
                  </Text>
                  <Text style={styles.tableCell}>
                    {policy.verificationStatus}
                  </Text>
                </View>
                {policy.insurer.contactPhone && (
                  <Text style={{ fontSize: 8, color: "#6B7280", marginTop: 2 }}>
                    Contact: {policy.insurer.contactPhone}
                    {policy.insurer.contactEmail && ` · ${policy.insurer.contactEmail}`}
                  </Text>
                )}
                {policy.beneficiaries.length > 0 && (
                  <View style={{ marginTop: 4 }}>
                    <Text style={{ fontSize: 8, fontWeight: 600, marginBottom: 2 }}>
                      Beneficiaries:
                    </Text>
                    {policy.beneficiaries.map((pb, idx) => (
                      <Text key={idx} style={{ fontSize: 8, marginLeft: 8 }}>
                        • {pb.beneficiary.firstName} {pb.beneficiary.lastName}
                        {pb.beneficiary.relationship
                          ? ` (${pb.beneficiary.relationship}`
                          : ""}
                        {pb.sharePercent != null ? ` — ${pb.sharePercent}%` : ""}
                        {pb.beneficiary.relationship ? ")" : ""}
                      </Text>
                    ))}
                  </View>
                )}
              </View>
            ))}
          </>
        )}

        {/* Beneficiaries Summary */}
        <Text style={styles.sectionTitle}>Beneficiaries Summary</Text>
        {beneficiaries.length === 0 ? (
          <Text style={{ fontStyle: "italic", color: "#6B7280" }}>
            No beneficiaries recorded.
          </Text>
        ) : (
          beneficiaries.map((beneficiary) => (
            <View key={beneficiary.id} style={styles.card}>
              <View style={styles.fieldRow}>
                <Text style={styles.fieldLabel}>Name:</Text>
                <Text style={styles.fieldValue}>
                  {beneficiary.firstName} {beneficiary.lastName}
                </Text>
              </View>
              {beneficiary.relationship && (
                <View style={styles.fieldRow}>
                  <Text style={styles.fieldLabel}>Relationship:</Text>
                  <Text style={styles.fieldValue}>{beneficiary.relationship}</Text>
                </View>
              )}
              {(beneficiary.email || beneficiary.phone) && (
                <View style={styles.fieldRow}>
                  <Text style={styles.fieldLabel}>Contact:</Text>
                  <Text style={styles.fieldValue}>
                    {beneficiary.email || ""}
                    {beneficiary.email && beneficiary.phone ? " · " : ""}
                    {beneficiary.phone || ""}
                  </Text>
                </View>
              )}
              {beneficiary.dateOfBirth && (
                <View style={styles.fieldRow}>
                  <Text style={styles.fieldLabel}>Date of Birth:</Text>
                  <Text style={styles.fieldValue}>
                    {beneficiary.dateOfBirth.toLocaleDateString("en-US", {
                      year: "numeric",
                      month: "short",
                      day: "numeric",
                    })}
                  </Text>
                </View>
              )}
            </View>
          ))
        )}

        {/* Important Notice */}
        <View style={styles.warning}>
          <Text style={styles.warningText}>
            IMPORTANT: This summary is based on information provided to the
            registry. Policy amounts, face values, and premium information are
            intentionally excluded. This document should be used in conjunction
            with direct verification from insurance carriers. All beneficiaries
            listed are as reported and should be verified against official policy
            documents.
          </Text>
        </View>

        <View style={styles.footer}>
          <Text>
            This probate summary report is generated for estate administration
            purposes. It summarizes life insurance policies and beneficiaries as
            recorded in the HeirVault registry system.
          </Text>
          {firmName && <Text style={{ marginTop: 4 }}>Prepared by {firmName}</Text>}
          <Text style={{ marginTop: 4 }}>
            Generated on {genDate} · This is a system-generated document
          </Text>
        </View>
      </Page>
    </Document>
  );
}

