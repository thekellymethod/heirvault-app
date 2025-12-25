import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
} from "@react-pdf/renderer";

const styles = StyleSheet.create({
  page: {
    padding: 40,
    fontSize: 10,
    fontFamily: "Helvetica",
    backgroundColor: "#FFFFFF",
  },
  header: {
    marginBottom: 20,
    borderBottomWidth: 3,
    borderBottomColor: "#000000",
    paddingBottom: 10,
  },
  title: {
    fontSize: 16,
    fontWeight: 700,
    color: "#000000",
    textAlign: "center",
    marginBottom: 5,
  },
  subtitle: {
    fontSize: 9,
    color: "#000000",
    textAlign: "center",
  },
  section: {
    marginBottom: 15,
    borderWidth: 2,
    borderColor: "#000000",
    padding: 10,
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: 700,
    color: "#000000",
    marginBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#000000",
    paddingBottom: 3,
  },
  fieldLabel: {
    fontSize: 8,
    fontWeight: 600,
    color: "#000000",
    marginBottom: 4,
  },
  boxRow: {
    flexDirection: "row",
    marginBottom: 8,
    gap: 3,
  },
  box: {
    width: 20,
    height: 25,
    borderWidth: 1.5,
    borderColor: "#000000",
    textAlign: "center",
    fontSize: 10,
    fontFamily: "Courier",
    paddingTop: 4,
  },
  instructions: {
    marginTop: 15,
    padding: 8,
    backgroundColor: "#F5F5F5",
    borderWidth: 1,
    borderColor: "#CCCCCC",
    fontSize: 7,
    lineHeight: 1.4,
  },
  footer: {
    marginTop: 20,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: "#CCCCCC",
    fontSize: 7,
    color: "#666666",
    textAlign: "center",
  },
});

interface UpdateFormData {
  receiptId: string,
  clientName: string,
  token: string,
  updateUrl: string,
}

interface UpdateFormPDFProps {
  formData: UpdateFormData;
}

export function UpdateFormPDF({ formData }: UpdateFormPDFProps) {
  const createBoxes = (count: number) => {
    return Array(count).fill(null).map((_, i) => (
      <View key={i} style={styles.box}>
        <Text></Text>
      </View>
    ));
  };

  return (
    <Document>
      <Page size="LETTER" style={styles.page}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>CLIENT INFORMATION UPDATE FORM</Text>
          <Text style={styles.subtitle}>HeirVault Life Insurance & Beneficiary Registry</Text>
          <Text style={styles.subtitle}>Receipt ID: {formData.receiptId}</Text>
        </View>

        {/* Instructions */}
        <View style={styles.instructions}>
          <Text style={{ fontWeight: 700, marginBottom: 3 }}>INSTRUCTIONS:</Text>
          <Text>1. Fill in each box with ONE character (letter or number)</Text>
          <Text>2. Use CAPITAL LETTERS only</Text>
          <Text>3. Leave boxes blank if information is not changing</Text>
          <Text>4. For dates, use format: MMDDYYYY (8 digits)</Text>
          <Text>5. For phone numbers, use format: 1234567890 (10 digits, no dashes or spaces)</Text>
          <Text>6. After filling out, scan this form and upload it to: {formData.updateUrl}</Text>
        </View>

        {/* Client Information Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>CLIENT INFORMATION</Text>

          <Text style={styles.fieldLabel}>First Name (20 characters max):</Text>
          <View style={styles.boxRow}>{createBoxes(20)}</View>

          <Text style={styles.fieldLabel}>Last Name (25 characters max):</Text>
          <View style={styles.boxRow}>{createBoxes(25)}</View>

          <Text style={styles.fieldLabel}>Email Address (50 characters max):</Text>
          <View style={styles.boxRow}>{createBoxes(50)}</View>

          <Text style={styles.fieldLabel}>Phone Number (10 digits, no dashes):</Text>
          <View style={styles.boxRow}>{createBoxes(10)}</View>

          <Text style={styles.fieldLabel}>Date of Birth (MMDDYYYY format):</Text>
          <View style={styles.boxRow}>{createBoxes(8)}</View>
        </View>

        {/* Policy Information Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>POLICY INFORMATION</Text>

          <Text style={styles.fieldLabel}>Policy Number (25 characters max):</Text>
          <View style={styles.boxRow}>{createBoxes(25)}</View>

          <Text style={styles.fieldLabel}>Insurer Name (40 characters max):</Text>
          <View style={styles.boxRow}>{createBoxes(40)}</View>

          <Text style={styles.fieldLabel}>Policy Type (TERM, WHOLE, UNIVERSAL, GROUP, OTHER - 10 characters max):</Text>
          <View style={styles.boxRow}>{createBoxes(10)}</View>
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          <Text>After completing this form, scan it and upload at: {formData.updateUrl}</Text>
          <Text style={{ marginTop: 5 }}>
            Or submit online at the same URL. This form is designed for easy OCR scanning.
          </Text>
        </View>
      </Page>
    </Document>
  );
}

