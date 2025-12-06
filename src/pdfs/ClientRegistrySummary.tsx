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
  },
  header: {
    marginBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#cccccc",
    paddingBottom: 6,
  },
  title: {
    fontSize: 16,
    fontWeight: 700,
  },
  subtitle: {
    fontSize: 9,
    marginTop: 2,
    color: "#666666",
  },
  sectionTitle: {
    fontSize: 11,
    marginTop: 12,
    marginBottom: 4,
    fontWeight: 700,
  },
  fieldRow: {
    flexDirection: "row",
    marginBottom: 2,
  },
  fieldLabel: {
    width: 110,
    color: "#666666",
  },
  fieldValue: {
    flex: 1,
  },
  card: {
    borderWidth: 1,
    borderColor: "#dddddd",
    borderRadius: 4,
    padding: 6,
    marginBottom: 4,
  },
  footer: {
    position: "absolute",
    bottom: 20,
    left: 40,
    right: 40,
    fontSize: 8,
    color: "#777777",
    borderTopWidth: 1,
    borderTopColor: "#dddddd",
    paddingTop: 4,
  },
});

interface PolicyWithBeneficiaries {
  id: string;
  insurer: {
    name: string;
    contactPhone: string | null;
    contactEmail: string | null;
    website: string | null;
  };
  policyNumber: string | null;
  policyType: string | null;
  beneficiaries: {
    beneficiary: {
      firstName: string;
      lastName: string;
      relationship: string;
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
  relationship: string;
  email: string | null;
  phone: string | null;
  notes: string | null;
}

interface ClientSummaryProps {
  client: {
    firstName: string;
    lastName: string;
    email: string;
    phone: string | null;
    dateOfBirth: Date | null;
    createdAt: Date;
    policies: PolicyWithBeneficiaries[];
    beneficiaries: Beneficiary[];
  };
  firmName?: string;
  generatedAt: Date;
}

export function ClientRegistrySummaryPDF({
  client,
  firmName,
  generatedAt,
}: ClientSummaryProps) {
  const fullName = `${client.firstName} ${client.lastName}`;
  const genDate = generatedAt.toLocaleString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Client Life Insurance & Beneficiary Registry</Text>
          <Text style={styles.subtitle}>
            Client: {fullName} · Generated: {genDate}
          </Text>
          {firmName && (
            <Text style={styles.subtitle}>Firm: {firmName}</Text>
          )}
        </View>

        {/* Client details */}
        <Text style={styles.sectionTitle}>Client Details</Text>
        <View style={styles.fieldRow}>
          <Text style={styles.fieldLabel}>Name:</Text>
          <Text style={styles.fieldValue}>{fullName}</Text>
        </View>
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

        {/* Policies */}
        <Text style={styles.sectionTitle}>Policies</Text>
        {client.policies.length === 0 ? (
          <Text>No policies recorded.</Text>
        ) : (
          client.policies.map((p) => (
            <View key={p.id} style={styles.card}>
              <Text>
                <Text style={{ fontWeight: 700 }}>Insurer: </Text>
                {p.insurer.name}
              </Text>
              <Text>
                <Text style={{ fontWeight: 700 }}>Type: </Text>
                {p.policyType || "N/A"}
              </Text>
              {p.policyNumber && (
                <Text>
                  <Text style={{ fontWeight: 700 }}>Policy #: </Text>
                  {p.policyNumber}
                </Text>
              )}
              {p.insurer.contactPhone && (
                <Text>
                  <Text style={{ fontWeight: 700 }}>Phone: </Text>
                  {p.insurer.contactPhone}
                </Text>
              )}
              {p.insurer.website && (
                <Text>
                  <Text style={{ fontWeight: 700 }}>Website: </Text>
                  {p.insurer.website}
                </Text>
              )}
              {p.beneficiaries.length > 0 && (
                <>
                  <Text style={{ marginTop: 3, fontWeight: 700 }}>
                    Beneficiaries:
                  </Text>
                  {p.beneficiaries.map((pb, idx) => (
                    <Text key={idx}>
                      • {pb.beneficiary.firstName} {pb.beneficiary.lastName} ({pb.beneficiary.relationship}
                      {pb.sharePercent != null ? ` — ${pb.sharePercent}%` : ""}
                      )
                    </Text>
                  ))}
                </>
              )}
            </View>
          ))
        )}

        {/* All beneficiaries (summary) */}
        <Text style={styles.sectionTitle}>Beneficiaries (Summary)</Text>
        {client.beneficiaries.length === 0 ? (
          <Text>No beneficiaries recorded.</Text>
        ) : (
          client.beneficiaries.map((b) => (
            <View key={b.id} style={styles.card}>
              <Text>
                <Text style={{ fontWeight: 700 }}>Name: </Text>
                {b.firstName} {b.lastName}
              </Text>
              <Text>
                <Text style={{ fontWeight: 700 }}>Relationship: </Text>
                {b.relationship}
              </Text>
              {(b.email || b.phone) && (
                <Text>
                  {b.email && <>Email: {b.email} </>}
                  {b.phone && (
                    <>
                      {b.email && "· "}
                      Phone: {b.phone}
                    </>
                  )}
                </Text>
              )}
              {b.notes && (
                <Text>
                  <Text style={{ fontWeight: 700 }}>Notes: </Text>
                  {b.notes}
                </Text>
              )}
            </View>
          ))
        )}

        <View style={styles.footer}>
          <Text>
            This registry summarizes reported life insurance relationships and
            named beneficiaries. Policy amounts and premium data are intentionally
            excluded.
          </Text>
          {firmName && <Text>Prepared by {firmName}</Text>}
        </View>
      </Page>
    </Document>
  );
}

