# Security & Compliance Quick Reference Guide

**For:** Internal Team Use  
**Last Updated:** December 2024

---

## 🚨 EMERGENCY CONTACTS

### Security Incidents
- **Security Team:** security@heirvault.app
- **On-Call Engineer:** [YOUR_ON_CALL_NUMBER]
- **Emergency Hotline:** [YOUR_EMERGENCY_NUMBER]

### Compliance & Legal
- **Compliance Officer:** compliance@heirvault.app
- **Privacy Officer:** privacy@heirvault.app
- **Legal Counsel:** [YOUR_LEGAL_EMAIL]

### External
- **Law Enforcement:** 911 (if criminal activity)
- **Cyber Insurance:** [YOUR_INSURANCE_CONTACT]

---

## 📋 COMPLIANCE STANDARDS CHECKLIST

### NIST CSF
- [ ] Identify: Asset inventory, risk assessment
- [ ] Protect: Access controls, encryption
- [ ] Detect: Monitoring, logging
- [ ] Respond: Incident response plan
- [ ] Recover: Backup, recovery procedures

### ISO/IEC 27001
- [ ] ISMS documented and maintained
- [ ] Risk assessments conducted
- [ ] Security controls implemented
- [ ] Regular audits performed
- [ ] Continuous improvement process

### SOC 2
- [ ] Trust Service Criteria met
- [ ] Controls documented
- [ ] Regular testing performed
- [ ] Reports available (under NDA)

### CIS Controls
- [ ] All 18 controls implemented
- [ ] Regular assessments
- [ ] Continuous monitoring

### GDPR
- [ ] Data subject rights procedures
- [ ] Breach notification procedures (72 hours)
- [ ] Data processing agreements
- [ ] Privacy by design

---

## 🚨 INCIDENT RESPONSE QUICK STEPS

### Step 1: STOP THE BLEEDING (0-15 min)
1. Isolate affected systems
2. Change compromised credentials
3. Block malicious IPs
4. Preserve evidence (DO NOT DELETE)

### Step 2: ALERT THE TEAM (0-15 min)
1. Notify Security Lead
2. Notify CTO
3. Notify Legal/Compliance
4. Activate Incident Response Team

### Step 3: DOCUMENT (0-30 min)
1. Create incident ticket
2. Document all actions
3. Screenshot evidence
4. Note timestamps

### Step 4: CONTAIN (0-2 hours)
1. Isolate systems
2. Disable accounts
3. Block traffic
4. Enable monitoring

### Step 5: INVESTIGATE (2-24 hours)
1. Determine scope
2. Identify root cause
3. Assess impact
4. Plan remediation

### Step 6: REMEDIATE (24-72 hours)
1. Remove threat
2. Patch vulnerabilities
3. Restore systems
4. Verify integrity

### Step 7: NOTIFY (If Required)
- **GDPR:** 72 hours to supervisory authority
- **Customers:** Without undue delay (if high risk)
- **Regulators:** Per requirements

### Step 8: POST-INCIDENT (72+ hours)
1. Post-mortem meeting
2. Document lessons learned
3. Update controls
4. Update playbook

---

## 📞 NOTIFICATION TIMELINES

### GDPR Breach Notification
- **Supervisory Authority:** 72 hours from discovery
- **Data Subjects:** Without undue delay (if high risk)

### SOC 2 Requirements
- Document all incidents
- Update risk register
- Review control effectiveness

### ISO/IEC 27001
- Follow ISMS procedures
- Update incident register
- Management review

---

## 🔍 KEY DOCUMENTS

1. **Incident Response Playbook:** `_docs/INCIDENT_RESPONSE_PLAYBOOK.md`
2. **Compliance Framework:** `_docs/COMPLIANCE_FRAMEWORK.md`
3. **Security Implementation:** `docs/SECURITY_IMPLEMENTATION.md`
4. **Compliance Page:** `/legal/compliance`

---

## ✅ REGULAR SECURITY TASKS

### Daily
- [ ] Review security alerts
- [ ] Monitor system logs
- [ ] Check for suspicious activity

### Weekly
- [ ] Review access logs
- [ ] Check failed login attempts
- [ ] Review security metrics

### Monthly
- [ ] Security control review
- [ ] Access review
- [ ] Vulnerability scanning
- [ ] Security awareness training

### Quarterly
- [ ] Penetration testing
- [ ] Security audit
- [ ] Incident response drill
- [ ] Policy review

### Annually
- [ ] Full security assessment
- [ ] Compliance audit
- [ ] Disaster recovery test
- [ ] Security training review

---

## 🛡️ SECURITY CONTROLS SUMMARY

### Access Control
- ✅ RBAC (Role-Based Access Control)
- ✅ MFA (Multi-Factor Authentication)
- ✅ Regular access reviews
- ✅ Principle of least privilege

### Data Protection
- ✅ Encryption at rest (AES-256)
- ✅ Encryption in transit (TLS 1.3)
- ✅ Data classification
- ✅ Backup and recovery

### Monitoring
- ✅ Security event logging
- ✅ Continuous monitoring
- ✅ Anomaly detection
- ✅ Audit trails

### Incident Response
- ✅ Incident response plan
- ✅ Response team defined
- ✅ Communication procedures
- ✅ Recovery procedures

---

## 📧 COMMUNICATION TEMPLATES

### Internal Alert
```
Subject: [CRITICAL/HIGH] Security Incident - [ID]

Team,
We have detected a [TYPE] security incident.

Severity: [LEVEL]
Time: [TIMESTAMP]
Affected: [SYSTEMS]
Status: [STATUS]

Actions: [ACTIONS TAKEN]
Next Update: [TIME]
```

### Customer Notification (if needed)
See Incident Response Playbook for full template.

---

## ⚠️ IMPORTANT REMINDERS

- **DO NOT** delete evidence
- **DO** document everything
- **DO** follow the playbook
- **DO** notify team immediately
- **DO** preserve logs and files
- **DO NOT** delay notifications (GDPR: 72 hours)

---

## 🔗 QUICK LINKS

- Compliance Page: https://heirvault.app/legal/compliance
- Privacy Policy: https://heirvault.app/legal/privacy
- Security Documentation: `docs/SECURITY_IMPLEMENTATION.md`

---

**Keep this document accessible and review regularly.**
