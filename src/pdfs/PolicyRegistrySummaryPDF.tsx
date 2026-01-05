import React from "react";
import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
} from "@react-pdf/renderer";

export type PolicyStatus = "Unknown" | "Requested" | "Verified" | "Paid" | "Denied";

export type PolicyRow = {
  carrier: string;
  policyNumberMasked: string;
  insured: string;
  beneficiaries: string;
  status: PolicyStatus;
  hasDocuments: boolean;
  notes?: string;
};

export type PolicyRegistrySummaryInput = {
  estateName: string;
  preparedFor: string;
  generatedISO: string;
  lastActivityLabel?: string;
  policies: PolicyRow[];
  watermark?: boolean;
};

const GOLD = "#C9A227";
const DARK = "#111827";
const GRAY = "#374151";
const LIGHT_LINE = "#E5E7EB";

const styles = StyleSheet.create({
  page: {
    paddingTop: 64,
    paddingBottom: 64,
    paddingLeft: 61,
    paddingRight: 61,
    fontSize: 10.5,
    color: GRAY,
    fontFamily: "Helvetica",
    backgroundColor: "#FFFFFF",
  },

  watermarkWrap: {
    position: "absolute",
    left: 0,
    top: 0,
    right: 0,
    bottom: 0,
    justifyContent: "center",
    alignItems: "center",
  },
  watermark: {
    fontSize: 54,
    color: "#999999",
    opacity: 0.18,
    transform: "rotate(30deg)",
    fontFamily: "Helvetica-Bold",
  },

  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    paddingBottom: 10,
    borderBottomWidth: 0.6,
    borderBottomColor: LIGHT_LINE,
  },
  brandLeft: {},
  brandName: { fontSize: 12, color: DARK, fontFamily: "Helvetica-Bold" },
  brandSub: { fontSize: 9, marginTop: 2 },

  headerRight: { alignItems: "flex-end" },
  headerMeta: { fontSize: 9, color: DARK, fontFamily: "Helvetica-Bold", marginBottom: 2 },

  title: { fontSize: 16, color: DARK, fontFamily: "Helvetica-Bold", marginTop: 18 },
  intro: { marginTop: 10, lineHeight: 1.35 },

  tableWrap: {
    marginTop: 16,
    borderTopWidth: 1.2,
    borderTopColor: GOLD,
  },
  tableHeader: {
    flexDirection: "row",
    backgroundColor: "#F7F7F7",
    borderBottomWidth: 0.6,
    borderBottomColor: LIGHT_LINE,
    paddingVertical: 8,
    paddingHorizontal: 6,
  },
  th: { fontSize: 9.5, color: DARK, fontFamily: "Helvetica-Bold" },

  row: {
    flexDirection: "row",
    paddingVertical: 8,
    paddingHorizontal: 6,
    borderBottomWidth: 0.4,
    borderBottomColor: LIGHT_LINE,
  },
  rowAlt: { backgroundColor: "#FAFAFA" },
  td: { fontSize: 9.5, color: DARK },

  // Column widths
  cCarrier: { width: "18%" },
  cPolicy: { width: "14%" },
  cInsured: { width: "16%" },
  cBene: { width: "20%" },
  cStatus: { width: "12%" },
  cDocs: { width: "10%" },
  cNotes: { width: "10%" },

  totalsTitle: { marginTop: 18, fontSize: 11.5, color: DARK, fontFamily: "Helvetica-Bold" },
  totalsGrid: { marginTop: 10, flexDirection: "row" },
  totalsCol: { width: "50%" },
  kv: { flexDirection: "row", marginBottom: 6 },
  k: { width: 150 },
  v: { color: DARK, fontFamily: "Helvetica" },

  footer: {
    position: "absolute",
    left: 61,
    right: 61,
    bottom: 36,
    borderTopWidth: 0.6,
    borderTopColor: LIGHT_LINE,
    paddingTop: 8,
    flexDirection: "row",
    justifyContent: "space-between",
    fontSize: 8.5,
  },

  // Page 2
  h2: { fontSize: 14, color: DARK, fontFamily: "Helvetica-Bold", marginTop: 18 },
  sectionLabel: { fontSize: 11.5, color: DARK, fontFamily: "Helvetica-Bold", marginTop: 16 },
  linesBox: { marginTop: 10, borderWidth: 0.6, borderColor: LIGHT_LINE, padding: 10 },
  line: { borderBottomWidth: 0.6, borderBottomColor: LIGHT_LINE, height: 18 },
  disclaimer: { marginTop: 10, lineHeight: 1.35 },
});

function statusCounts(rows: PolicyRow[]) {
  const verified = rows.filter(r => r.status === "Verified").length;
  const pending = rows.filter(r => r.status !== "Verified").length;
  const docsYes = rows.some(r => r.hasDocuments);
  return { verified, pending, docsYes };
}

export function PolicyRegistrySummaryPDF({ input }: { input: PolicyRegistrySummaryInput }) {
  const generated = new Date(input.generatedISO);
  const dateLabel = generated.toLocaleDateString("en-US", { year: "numeric", month: "long", day: "2-digit" });

  const totals = statusCounts(input.policies);

  return (
    <Document>
      <Page size="LETTER" style={styles.page}>
        {input.watermark && (
          <View style={styles.watermarkWrap} fixed>
            <Text style={styles.watermark}>SAMPLE — REDACTED</Text>
          </View>
        )}

        <View style={styles.headerRow}>
          <View style={styles.brandLeft}>
            <Text style={styles.brandName}>HEIRVAULT</Text>
            <Text style={styles.brandSub}>Life Insurance Policy Registry</Text>
          </View>
          <View style={styles.headerRight}>
            <Text style={styles.headerMeta}>Estate / Matter: {input.estateName}</Text>
            <Text style={styles.headerMeta}>Prepared for: {input.preparedFor}</Text>
            <Text style={styles.headerMeta}>Generated: {dateLabel}</Text>
          </View>
        </View>

        <Text style={styles.title}>Policy Registry Summary</Text>
        <Text style={styles.intro}>
          This summary reflects known or suspected life insurance policies associated with the referenced estate as of
          the generation date above. Policy status reflects verification progress at the time of export.
        </Text>

        {/* Table */}
        <View style={styles.tableWrap}>
          <View style={styles.tableHeader}>
            <Text style={[styles.th, styles.cCarrier]}>Carrier</Text>
            <Text style={[styles.th, styles.cPolicy]}>Policy #</Text>
            <Text style={[styles.th, styles.cInsured]}>Insured</Text>
            <Text style={[styles.th, styles.cBene]}>Beneficiaries</Text>
            <Text style={[styles.th, styles.cStatus]}>Status</Text>
            <Text style={[styles.th, styles.cDocs]}>Documents</Text>
            <Text style={[styles.th, styles.cNotes]}>Notes</Text>
          </View>

          {input.policies.map((p, idx) => (
            <View key={idx} style={[styles.row, idx % 2 === 1 ? styles.rowAlt : null]}>
              <Text style={[styles.td, styles.cCarrier]}>{p.carrier}</Text>
              <Text style={[styles.td, styles.cPolicy]}>{p.policyNumberMasked}</Text>
              <Text style={[styles.td, styles.cInsured]}>{p.insured}</Text>
              <Text style={[styles.td, styles.cBene]}>{p.beneficiaries}</Text>
              <Text style={[styles.td, styles.cStatus]}>{p.status}</Text>
              <Text style={[styles.td, styles.cDocs]}>{p.hasDocuments ? "✓" : "—"}</Text>
              <Text style={[styles.td, styles.cNotes]}>{p.notes ?? ""}</Text>
            </View>
          ))}
        </View>

        {/* Totals */}
        <Text style={styles.totalsTitle}>Registry Totals</Text>
        <View style={styles.totalsGrid}>
          <View style={styles.totalsCol}>
            <View style={styles.kv}><Text style={styles.k}>Total policies listed:</Text><Text style={styles.v}>{input.policies.length}</Text></View>
            <View style={styles.kv}><Text style={styles.k}>Verified:</Text><Text style={styles.v}>{totals.verified}</Text></View>
            <View style={styles.kv}><Text style={styles.k}>Pending / Unknown:</Text><Text style={styles.v}>{totals.pending}</Text></View>
          </View>
          <View style={styles.totalsCol}>
            <View style={styles.kv}><Text style={styles.k}>Documents attached:</Text><Text style={styles.v}>{totals.docsYes ? "Yes" : "No"}</Text></View>
            <View style={styles.kv}><Text style={styles.k}>Last update activity:</Text><Text style={styles.v}>{input.lastActivityLabel ?? "—"}</Text></View>
          </View>
        </View>

        <View style={styles.footer} fixed>
          <Text>HeirVault • Private Policy Registry</Text>
          <Text render={({ pageNumber, totalPages }) => `Page ${pageNumber} of ${totalPages}`} />
        </View>
      </Page>

      {/* Page 2 */}
      <Page size="LETTER" style={styles.page}>
        {input.watermark && (
          <View style={styles.watermarkWrap} fixed>
            <Text style={styles.watermark}>SAMPLE — REDACTED</Text>
          </View>
        )}

        <View style={styles.headerRow}>
          <View style={styles.brandLeft}>
            <Text style={styles.brandName}>HEIRVAULT</Text>
            <Text style={styles.brandSub}>Life Insurance Policy Registry</Text>
          </View>
          <View style={styles.headerRight}>
            <Text style={styles.headerMeta}>Estate / Matter: {input.estateName}</Text>
            <Text style={styles.headerMeta}>Prepared for: {input.preparedFor}</Text>
            <Text style={styles.headerMeta}>Generated: {new Date(input.generatedISO).toLocaleDateString("en-US")}</Text>
          </View>
        </View>

        <Text style={styles.h2}>Notes & Attestation</Text>

        <Text style={styles.sectionLabel}>Notes & Context</Text>
        <Text style={{ marginTop: 6 }}>
          Notes relevant to policy discovery, verification, or carrier correspondence:
        </Text>

        <View style={styles.linesBox}>
          {Array.from({ length: 12 }).map((_, i) => (
            <View key={i} style={styles.line} />
          ))}
        </View>

        <Text style={styles.sectionLabel}>Attestation / Disclaimer</Text>
        <Text style={styles.disclaimer}>
          This registry is based on information provided to date and does not represent a guarantee that all life
          insurance policies associated with the estate have been identified. Additional policies may exist.
        </Text>

        <View style={styles.footer} fixed>
          <Text>HeirVault • Private Policy Registry</Text>
          <Text render={({ pageNumber, totalPages }) => `Page ${pageNumber} of ${totalPages}`} />
        </View>
      </Page>
    </Document>
  );
}
