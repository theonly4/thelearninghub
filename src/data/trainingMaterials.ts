import { TrainingMaterial, WorkforceGroup } from "@/types/hipaa";

export const trainingMaterials: TrainingMaterial[] = [
  // All Staff Training Materials
  {
    id: "tm-all-staff-1",
    workforce_groups: ["all_staff", "clinical", "administrative", "management", "it"],
    sequence_number: 1,
    title: "HIPAA Fundamentals: Understanding PHI",
    description: "Learn the basics of Protected Health Information (PHI) and why HIPAA exists to safeguard patient data.",
    estimated_minutes: 15,
    version: 1,
    hipaa_citations: ["45 CFR §160.103", "45 CFR §164.501"],
    content: [
      {
        title: "What is HIPAA?",
        content: `The Health Insurance Portability and Accountability Act (HIPAA) was enacted in 1996 to protect the privacy and security of individuals' health information. HIPAA establishes national standards for the protection of Protected Health Information (PHI).

HIPAA applies to:
• Covered Entities: Health plans, healthcare clearinghouses, and healthcare providers who transmit health information electronically
• Business Associates: Organizations that perform functions on behalf of covered entities involving PHI

As a workforce member, you play a critical role in maintaining HIPAA compliance and protecting patient privacy.`,
        hipaa_citations: ["45 CFR §160.103"],
      },
      {
        title: "What is Protected Health Information (PHI)?",
        content: `PHI is individually identifiable health information that is transmitted or maintained in any form (electronic, paper, or oral). PHI includes:

18 HIPAA Identifiers:
1. Names
2. Geographic data smaller than a state
3. Dates (except year) related to an individual
4. Phone numbers
5. Fax numbers
6. Email addresses
7. Social Security numbers
8. Medical record numbers
9. Health plan beneficiary numbers
10. Account numbers
11. Certificate/license numbers
12. Vehicle identifiers and serial numbers
13. Device identifiers and serial numbers
14. Web URLs
15. IP addresses
16. Biometric identifiers
17. Full-face photographs
18. Any other unique identifying number or code

When health information is combined with any of these identifiers, it becomes PHI and must be protected under HIPAA.`,
        hipaa_citations: ["45 CFR §160.103", "45 CFR §164.514(b)(2)"],
      },
      {
        title: "The Minimum Necessary Rule",
        content: `The Minimum Necessary Rule requires that covered entities and business associates limit PHI access, use, and disclosure to the minimum necessary to accomplish the intended purpose.

Key Principles:
• Only access PHI that you need to perform your job duties
• Only share PHI that is directly relevant to the task at hand
• Do not access patient records out of curiosity, even for family members
• Request only the information needed when obtaining PHI from others

Exceptions to Minimum Necessary:
• Disclosures to or requests by healthcare providers for treatment
• Uses or disclosures made to the individual
• Disclosures made to HHS for compliance investigations
• Uses or disclosures required by law

Violations of the Minimum Necessary Rule can result in significant penalties and disciplinary action.`,
        hipaa_citations: ["45 CFR §164.502(b)", "45 CFR §164.514(d)"],
      },
    ],
  },
  {
    id: "tm-all-staff-2",
    workforce_groups: ["all_staff", "clinical", "administrative", "management", "it"],
    sequence_number: 2,
    title: "Patient Rights Under HIPAA",
    description: "Understand the rights patients have regarding their health information and how to respect them.",
    estimated_minutes: 20,
    version: 1,
    hipaa_citations: ["45 CFR §164.524", "45 CFR §164.526", "45 CFR §164.528"],
    content: [
      {
        title: "Right to Access",
        content: `Patients have the right to access and obtain a copy of their PHI maintained in a designated record set.

Key Requirements:
• Covered entities must respond to access requests within 30 days (one 30-day extension permitted)
• Patients can request records in electronic format
• Reasonable cost-based fees may be charged for copies
• Access can only be denied in limited circumstances with proper review process

Designated Record Set includes:
• Medical records
• Billing records
• Enrollment, payment, and claims records
• Other records used to make decisions about the individual`,
        hipaa_citations: ["45 CFR §164.524"],
      },
      {
        title: "Right to Amendment",
        content: `Patients have the right to request amendments to their PHI if they believe the information is incorrect or incomplete.

Amendment Process:
• Requests must be in writing and include a reason for the amendment
• Covered entities must respond within 60 days (one 30-day extension permitted)
• If accepted, the amendment must be linked to the original record
• If denied, patients have the right to file a statement of disagreement

Grounds for Denial:
• Information was not created by the covered entity
• Information is not part of the designated record set
• Information is accurate and complete
• Information would not be available for access under 164.524`,
        hipaa_citations: ["45 CFR §164.526"],
      },
      {
        title: "Right to an Accounting of Disclosures",
        content: `Patients have the right to receive an accounting of disclosures of their PHI made by a covered entity.

What Must Be Included:
• Date of disclosure
• Name and address of recipient
• Brief description of PHI disclosed
• Purpose of disclosure or copy of authorization

Disclosures Exempt from Accounting:
• Disclosures for treatment, payment, or healthcare operations
• Disclosures to the individual
• Disclosures pursuant to an authorization
• Disclosures for national security purposes

The accounting must cover at least 6 years prior to the request.`,
        hipaa_citations: ["45 CFR §164.528"],
      },
    ],
  },
  {
    id: "tm-all-staff-3",
    workforce_groups: ["all_staff", "clinical", "administrative", "management", "it"],
    sequence_number: 3,
    title: "Breach Notification Requirements",
    description: "Learn how to identify, report, and respond to potential breaches of PHI.",
    estimated_minutes: 25,
    version: 1,
    hipaa_citations: ["45 CFR §164.400", "45 CFR §164.402", "45 CFR §164.404"],
    content: [
      {
        title: "What Constitutes a Breach?",
        content: `A breach is the unauthorized acquisition, access, use, or disclosure of PHI that compromises the security or privacy of the PHI.

Breach Analysis (4-Factor Risk Assessment):
1. The nature and extent of PHI involved
2. The unauthorized person who used or received the PHI
3. Whether PHI was actually acquired or viewed
4. The extent to which the risk to the PHI has been mitigated

Exclusions from Breach Definition:
• Unintentional access by workforce member in good faith
• Inadvertent disclosure between authorized persons
• Disclosure where unauthorized person could not retain the information`,
        hipaa_citations: ["45 CFR §164.402"],
      },
      {
        title: "Notification Requirements",
        content: `When a breach occurs, specific notification requirements must be followed:

Individual Notice:
• Without unreasonable delay, no later than 60 days after discovery
• Written notice by first-class mail (or email if individual agreed)
• Must include description of breach, types of PHI involved, steps to protect, and contact information

HHS Notification:
• Breaches affecting 500+ individuals: notify HHS within 60 days
• Breaches affecting fewer than 500: annual log submission

Media Notification:
• Required for breaches affecting 500+ residents of a state or jurisdiction
• Prominent media outlets must be notified within 60 days

Business Associates must notify covered entities within 60 days of discovering a breach.`,
        hipaa_citations: ["45 CFR §164.404", "45 CFR §164.406", "45 CFR §164.408", "45 CFR §164.410"],
      },
      {
        title: "Your Role in Breach Prevention",
        content: `Every workforce member plays a critical role in preventing breaches:

Best Practices:
• Never leave PHI unattended (screens, papers, conversations)
• Use strong passwords and never share credentials
• Verify recipient identity before disclosing PHI
• Report any suspected breaches immediately
• Encrypt portable devices containing PHI
• Properly dispose of PHI (shred paper, wipe devices)

Immediate Reporting:
If you suspect a breach has occurred, report it immediately to your Privacy Officer or Compliance Department. Do not attempt to investigate on your own.

Early detection and reporting can significantly reduce the impact of a breach and may reduce penalties.`,
        hipaa_citations: ["45 CFR §164.308(a)(6)", "45 CFR §164.530(b)"],
      },
    ],
  },

  // Clinical Staff Materials
  {
    id: "tm-clinical-1",
    workforce_groups: ["clinical"],
    sequence_number: 4,
    title: "Clinical Staff: Treatment Disclosures",
    description: "Learn the specific rules for using and disclosing PHI for treatment purposes.",
    estimated_minutes: 20,
    version: 1,
    hipaa_citations: ["45 CFR §164.506", "45 CFR §164.510"],
    content: [
      {
        title: "Treatment Use Exception",
        content: `Healthcare providers can use and disclose PHI for treatment purposes without patient authorization.

Treatment Definition:
Treatment includes the provision, coordination, or management of healthcare and related services. This includes:
• Consultation between providers about a patient
• Referral of a patient to another provider
• Ordering tests and prescriptions

Key Points:
• Treatment disclosures are exempt from the Minimum Necessary Rule
• Documentation of treatment disclosures is not required
• However, you should still limit access to what is clinically relevant`,
        hipaa_citations: ["45 CFR §164.506(c)", "45 CFR §164.502(b)(2)"],
      },
      {
        title: "Communication with Family and Friends",
        content: `Providers may disclose PHI to family members, friends, or others involved in the patient's care or payment:

Requirements:
• Disclosure must be directly relevant to the person's involvement
• Patient must be given opportunity to agree or object (when possible)
• Professional judgment may be used when patient is incapacitated

Special Situations:
• Emergency situations: use professional judgment in patient's best interest
• Deceased patients: information may be disclosed to those involved in care or payment before death`,
        hipaa_citations: ["45 CFR §164.510(b)"],
      },
    ],
  },

  // Administrative Staff Materials
  {
    id: "tm-admin-1",
    workforce_groups: ["administrative"],
    sequence_number: 4,
    title: "Administrative Staff: Billing and Records",
    description: "Learn the HIPAA requirements specific to administrative and billing functions.",
    estimated_minutes: 20,
    version: 1,
    hipaa_citations: ["45 CFR §164.501", "45 CFR §164.506"],
    content: [
      {
        title: "Payment and Healthcare Operations",
        content: `Administrative staff commonly use PHI for payment and healthcare operations without authorization.

Payment Activities:
• Billing and claims processing
• Eligibility determinations
• Coverage decisions
• Collection activities

Healthcare Operations:
• Quality assessment and improvement
• Case management and care coordination
• Competency reviews and training
• Business planning and administration

Important: The Minimum Necessary Rule applies to payment and healthcare operations uses.`,
        hipaa_citations: ["45 CFR §164.501", "45 CFR §164.506(c)"],
      },
      {
        title: "Verification Requirements",
        content: `Before disclosing PHI, you must verify the identity and authority of the person requesting information.

Verification Steps:
1. Confirm the requester's identity
2. Verify they are authorized to receive the information
3. Ensure the request is for a permitted purpose
4. Document the verification as appropriate

For Telephone Requests:
• Ask for callback number and verify through directory
• Use pre-established security questions
• Be cautious of social engineering attempts`,
        hipaa_citations: ["45 CFR §164.514(h)"],
      },
    ],
  },

  // Management Materials
  {
    id: "tm-mgmt-1",
    workforce_groups: ["management"],
    sequence_number: 4,
    title: "Management: Compliance Leadership",
    description: "Leadership responsibilities for maintaining organizational HIPAA compliance.",
    estimated_minutes: 25,
    version: 1,
    hipaa_citations: ["45 CFR §164.530", "45 CFR §164.308"],
    content: [
      {
        title: "Organizational Compliance Requirements",
        content: `Management must ensure the organization maintains comprehensive HIPAA compliance:

Required Policies and Procedures:
• Privacy policies addressing all required elements
• Security policies covering administrative, physical, and technical safeguards
• Breach notification procedures
• Sanction policy for workforce violations

Documentation Requirements:
• All policies must be in writing
• Retention period of 6 years from creation or last effective date
• Must be available to workforce members`,
        hipaa_citations: ["45 CFR §164.530(i)", "45 CFR §164.316(b)"],
      },
      {
        title: "Training Program Requirements",
        content: `Management is responsible for ensuring workforce training programs meet HIPAA requirements:

Training Requirements:
• All workforce members must be trained on policies and procedures
• Training must occur within reasonable time of joining
• Retraining required when material changes occur
• Training completion must be documented

Training Content:
• Privacy and security policies
• Job-specific PHI handling procedures
• Breach identification and reporting
• Sanction policy for violations`,
        hipaa_citations: ["45 CFR §164.530(b)", "45 CFR §164.308(a)(5)"],
      },
    ],
  },

  // IT Staff Materials
  {
    id: "tm-it-1",
    workforce_groups: ["it"],
    sequence_number: 4,
    title: "IT Security: Technical Safeguards",
    description: "Technical security requirements for protecting electronic PHI (ePHI).",
    estimated_minutes: 30,
    version: 1,
    hipaa_citations: ["45 CFR §164.312", "45 CFR §164.308"],
    content: [
      {
        title: "Access Control Requirements",
        content: `IT must implement access control measures to protect ePHI:

Required Specifications:
• Unique User Identification (Required): Each user must have a unique identifier
• Emergency Access Procedure (Required): Establish procedures for obtaining ePHI during emergencies
• Automatic Logoff (Addressable): Implement electronic procedures to terminate sessions after inactivity
• Encryption and Decryption (Addressable): Implement mechanisms to encrypt and decrypt ePHI

Implementation Considerations:
• Role-based access control aligned with job functions
• Regular access reviews and termination procedures
• Multi-factor authentication for remote access`,
        hipaa_citations: ["45 CFR §164.312(a)(1)", "45 CFR §164.312(a)(2)"],
      },
      {
        title: "Audit Controls and Integrity",
        content: `IT must implement mechanisms to record and examine system activity:

Audit Controls (Required):
• Hardware, software, and procedural mechanisms
• Recording and examination of activity in systems containing ePHI
• Log retention aligned with organizational policy

Integrity Controls (Addressable):
• Mechanisms to authenticate ePHI
• Protection against improper alteration or destruction
• Integrity verification for transmitted ePHI

Transmission Security (Addressable):
• Encryption for ePHI transmitted over networks
• Integrity controls for transmitted data`,
        hipaa_citations: ["45 CFR §164.312(b)", "45 CFR §164.312(c)", "45 CFR §164.312(e)"],
      },
    ],
  },
];

// Helper function to get materials for a workforce group
export function getMaterialsForWorkforceGroup(workforceGroup: WorkforceGroup): TrainingMaterial[] {
  return trainingMaterials
    .filter(material => material.workforce_groups.includes(workforceGroup))
    .sort((a, b) => a.sequence_number - b.sequence_number);
}

// Helper function to get required material IDs for a workforce group
export function getRequiredMaterialIds(workforceGroup: WorkforceGroup): string[] {
  return getMaterialsForWorkforceGroup(workforceGroup).map(m => m.id);
}
