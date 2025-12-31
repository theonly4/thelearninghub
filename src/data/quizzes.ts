import { Quiz, WorkforceGroup } from "@/types/hipaa";

export const quizzes: Quiz[] = [
  // All Staff Quiz 1
  {
    id: "quiz-all-staff-1",
    workforce_groups: ["all_staff", "clinical", "administrative", "management", "it"],
    sequence_number: 1,
    version: 1,
    title: "HIPAA Fundamentals Quiz 1",
    description: "Test your understanding of PHI basics and the Minimum Necessary Rule.",
    passing_score: 80,
    effective_date: "2024-01-01",
    hipaa_citations: ["45 CFR §164.502(b)", "45 CFR §164.508", "45 CFR §160.103"],
    questions: [
      {
        id: "as1-q1",
        question_number: 1,
        scenario: "A health tech startup employee needs to access patient medical records to resolve a billing discrepancy. The employee is authorized to process billing, but the records contain detailed psychiatric notes unrelated to billing.",
        question_text: "What should the employee do?",
        options: [
          { id: "a", label: "A", text: "Access the full record since they have general authorization needed" },
          { id: "b", label: "B", text: "Request only the billing-related information needed" },
          { id: "c", label: "C", text: "Ask the supervisor for special permission to see psychiatric notes" },
          { id: "d", label: "D", text: "Access the record but ignore the psychiatric data" },
        ],
        correct_answer: "b",
        rationale: "Covered entities and business associates must limit PHI access, use, and disclosure to the minimum necessary to accomplish the intended purpose. Even if authorized for billing, employees cannot access information beyond what is needed. Psychiatric notes are not minimum necessary for a billing discrepancy resolution.",
        hipaa_section: "45 CFR §164.502(b)",
      },
      {
        id: "as1-q2",
        question_number: 2,
        scenario: "A patient calls your startup and verbally requests to share their PHI with a family member. Your team documents the request and emails the information the next day.",
        question_text: "Is this compliant?",
        options: [
          { id: "a", label: "A", text: "Yes, verbal authorization is sufficient for simple disclosures" },
          { id: "b", label: "B", text: "No, 45 CFR §164.508 requires signed, written authorization" },
          { id: "c", label: "C", text: "Yes, if the email is BCC'd to compliance" },
          { id: "d", label: "D", text: "No, but verbal authorization with documentation works" },
        ],
        correct_answer: "b",
        rationale: "45 CFR §164.508 mandates that uses and disclosures of PHI for purposes other than treatment, payment, or healthcare operations require written authorization signed by the individual.",
        hipaa_section: "45 CFR §164.508(a)(1)",
      },
      {
        id: "as1-q3",
        question_number: 3,
        scenario: "Your startup's IT department discovers that an employee left a laptop containing unencrypted patient data in a taxi. The laptop was recovered within 2 hours.",
        question_text: "Should you notify affected individuals?",
        options: [
          { id: "a", label: "A", text: "No, the data was recovered quickly" },
          { id: "b", label: "B", text: "Yes, notification depends on a risk assessment determining if there was unauthorized access" },
          { id: "c", label: "C", text: "No, recovered devices are never considered breaches" },
          { id: "d", label: "D", text: "Yes, all data loss requires notification" },
        ],
        correct_answer: "b",
        rationale: "Quick recovery does not eliminate breach risk. A risk assessment must be conducted to determine if there is a low probability that the PHI was accessed or compromised.",
        hipaa_section: "45 CFR §164.402(2)",
      },
      {
        id: "as1-q4",
        question_number: 4,
        scenario: "A health tech startup provides care coordination services. A patient authorizes disclosure to their employer's health plan for insurance verification purposes. The authorization form doesn't specify an expiration date.",
        question_text: "Is the authorization valid?",
        options: [
          { id: "a", label: "A", text: "Yes, authorizations without expiration dates are perpetual" },
          { id: "b", label: "B", text: "No, §164.508 requires explicit expiration date or event" },
          { id: "c", label: "C", text: "Yes, if it's for a specific purpose" },
          { id: "d", label: "D", text: "No, but it can be used for 30 days" },
        ],
        correct_answer: "b",
        rationale: "45 CFR §164.508(c)(1)(v) requires that authorizations specify an expiration date or event. Without this, the authorization is invalid. Authorizations cannot be indefinite.",
        hipaa_section: "45 CFR §164.508(c)(1)(v)",
      },
      {
        id: "as1-q5",
        question_number: 5,
        scenario: "Your startup receives a subpoena for patient medical records. The patient has not provided authorization.",
        question_text: "What must you do?",
        options: [
          { id: "a", label: "A", text: "Release records immediately; subpoenas override privacy requirements" },
          { id: "b", label: "B", text: "Verify the subpoena meets HIPAA requirements before disclosure" },
          { id: "c", label: "C", text: "Refuse to release any records without patient consent" },
          { id: "d", label: "D", text: "Contact the patient to obtain verbal authorization" },
        ],
        correct_answer: "b",
        rationale: "A subpoena alone does not override HIPAA. You must verify that proper safeguards are in place, such as a court order or evidence that the patient was notified and had opportunity to object.",
        hipaa_section: "45 CFR §164.512(e)",
      },
    ],
  },
  // All Staff Quiz 2
  {
    id: "quiz-all-staff-2",
    workforce_groups: ["all_staff", "clinical", "administrative", "management", "it"],
    sequence_number: 2,
    version: 1,
    title: "HIPAA Fundamentals Quiz 2",
    description: "Continue testing your knowledge of patient rights and breach notification.",
    passing_score: 80,
    effective_date: "2024-01-01",
    hipaa_citations: ["45 CFR §164.524", "45 CFR §164.526", "45 CFR §164.404"],
    questions: [
      {
        id: "as2-q1",
        question_number: 1,
        scenario: "A patient requests access to their complete medical record, including psychotherapy notes.",
        question_text: "Must you provide access to the psychotherapy notes?",
        options: [
          { id: "a", label: "A", text: "Yes, patients have unrestricted access to all their records" },
          { id: "b", label: "B", text: "No, psychotherapy notes may be excluded from the right of access" },
          { id: "c", label: "C", text: "Only if the therapist approves" },
          { id: "d", label: "D", text: "Only after a 90-day waiting period" },
        ],
        correct_answer: "b",
        rationale: "Under 45 CFR §164.524(a)(1)(i), psychotherapy notes are specifically excluded from the individual's right of access.",
        hipaa_section: "45 CFR §164.524(a)(1)(i)",
      },
      {
        id: "as2-q2",
        question_number: 2,
        scenario: "A patient requests to amend their medical record to remove a diagnosis they disagree with.",
        question_text: "What is the appropriate response?",
        options: [
          { id: "a", label: "A", text: "Remove the diagnosis immediately at patient request" },
          { id: "b", label: "B", text: "Deny the request but allow the patient to submit a statement of disagreement" },
          { id: "c", label: "C", text: "Require a court order to make any changes" },
          { id: "d", label: "D", text: "Forward the request to the patient's insurance company" },
        ],
        correct_answer: "b",
        rationale: "Covered entities may deny amendment requests if the information is accurate and complete. The patient has the right to submit a statement of disagreement that must be linked to the record.",
        hipaa_section: "45 CFR §164.526(d)",
      },
      {
        id: "as2-q3",
        question_number: 3,
        scenario: "A breach affects 600 individuals across three states. You discover the breach on January 1st.",
        question_text: "By what date must you notify the affected individuals and media?",
        options: [
          { id: "a", label: "A", text: "January 15th" },
          { id: "b", label: "B", text: "March 2nd (60 days)" },
          { id: "c", label: "C", text: "December 31st (end of year)" },
          { id: "d", label: "D", text: "Only HHS needs notification" },
        ],
        correct_answer: "b",
        rationale: "For breaches affecting 500 or more individuals, notification to individuals, HHS, and prominent media outlets must occur without unreasonable delay, no later than 60 days after discovery.",
        hipaa_section: "45 CFR §164.404(b)",
      },
      {
        id: "as2-q4",
        question_number: 4,
        scenario: "A patient requests an accounting of all disclosures of their PHI for the past 3 years.",
        question_text: "Which disclosures must be included in the accounting?",
        options: [
          { id: "a", label: "A", text: "All disclosures including treatment, payment, and healthcare operations" },
          { id: "b", label: "B", text: "Only disclosures not covered by TPO, authorized disclosures, or disclosures to the individual" },
          { id: "c", label: "C", text: "Only disclosures to government agencies" },
          { id: "d", label: "D", text: "Disclosures are never tracked under HIPAA" },
        ],
        correct_answer: "b",
        rationale: "The accounting of disclosures excludes disclosures for treatment, payment, healthcare operations, disclosures to the individual, and disclosures made pursuant to an authorization.",
        hipaa_section: "45 CFR §164.528(a)(1)",
      },
      {
        id: "as2-q5",
        question_number: 5,
        scenario: "You notice a coworker accessing patient records that are not related to their job duties.",
        question_text: "What should you do?",
        options: [
          { id: "a", label: "A", text: "Mind your own business; they probably have a reason" },
          { id: "b", label: "B", text: "Report the potential violation to your Privacy Officer immediately" },
          { id: "c", label: "C", text: "Confront the coworker directly and ask them to stop" },
          { id: "d", label: "D", text: "Wait to see if they do it again before reporting" },
        ],
        correct_answer: "b",
        rationale: "Workforce members have a duty to report potential HIPAA violations. Unauthorized access to PHI is a serious violation that must be reported to the Privacy Officer for investigation.",
        hipaa_section: "45 CFR §164.530(e)",
      },
    ],
  },
  // All Staff Quiz 3
  {
    id: "quiz-all-staff-3",
    workforce_groups: ["all_staff", "clinical", "administrative", "management", "it"],
    sequence_number: 3,
    version: 1,
    title: "HIPAA Fundamentals Quiz 3",
    description: "Final assessment covering security safeguards and compliance requirements.",
    passing_score: 80,
    effective_date: "2024-01-01",
    hipaa_citations: ["45 CFR §164.308", "45 CFR §164.312", "45 CFR §164.530"],
    questions: [
      {
        id: "as3-q1",
        question_number: 1,
        scenario: "Your organization is updating its password policy for systems containing ePHI.",
        question_text: "Which of the following is required under HIPAA?",
        options: [
          { id: "a", label: "A", text: "Passwords must be at least 20 characters" },
          { id: "b", label: "B", text: "Unique user identification must be implemented" },
          { id: "c", label: "C", text: "Passwords must be changed daily" },
          { id: "d", label: "D", text: "Only biometric authentication is acceptable" },
        ],
        correct_answer: "b",
        rationale: "45 CFR §164.312(a)(2)(i) requires unique user identification as a technical safeguard. HIPAA does not specify exact password requirements but requires mechanisms to identify and track user identity.",
        hipaa_section: "45 CFR §164.312(a)(2)(i)",
      },
      {
        id: "as3-q2",
        question_number: 2,
        scenario: "A vendor who processes claims data on behalf of your covered entity asks for direct access to patient records.",
        question_text: "What is required before granting access?",
        options: [
          { id: "a", label: "A", text: "Nothing, vendors are automatically authorized" },
          { id: "b", label: "B", text: "A signed Business Associate Agreement (BAA) must be in place" },
          { id: "c", label: "C", text: "Patient consent for each vendor" },
          { id: "d", label: "D", text: "Approval from HHS" },
        ],
        correct_answer: "b",
        rationale: "Before a business associate can access PHI, a written Business Associate Agreement must be executed that requires the BA to appropriately safeguard the information.",
        hipaa_section: "45 CFR §164.502(e)",
      },
      {
        id: "as3-q3",
        question_number: 3,
        scenario: "Your organization conducts an annual risk analysis of ePHI systems.",
        question_text: "Is this sufficient to meet HIPAA requirements?",
        options: [
          { id: "a", label: "A", text: "Yes, annual risk analysis is all that is required" },
          { id: "b", label: "B", text: "No, risk analysis should be ongoing and updated when changes occur" },
          { id: "c", label: "C", text: "Risk analysis is optional for small organizations" },
          { id: "d", label: "D", text: "Only required after a breach" },
        ],
        correct_answer: "b",
        rationale: "Risk analysis is not a one-time activity. It must be ongoing, particularly when there are changes to the environment, new threats, or after security incidents.",
        hipaa_section: "45 CFR §164.308(a)(1)(ii)(A)",
      },
      {
        id: "as3-q4",
        question_number: 4,
        scenario: "An employee is terminated and their access to systems containing ePHI needs to be addressed.",
        question_text: "What is the compliant approach?",
        options: [
          { id: "a", label: "A", text: "Disable access within 30 days of termination" },
          { id: "b", label: "B", text: "Terminate access immediately upon employment termination" },
          { id: "c", label: "C", text: "Allow access until end of pay period" },
          { id: "d", label: "D", text: "Access rights remain valid for 6 months post-termination" },
        ],
        correct_answer: "b",
        rationale: "Access termination procedures must ensure that workforce member access is terminated when their employment or duties end. This should be immediate to prevent unauthorized access.",
        hipaa_section: "45 CFR §164.308(a)(3)(ii)(C)",
      },
      {
        id: "as3-q5",
        question_number: 5,
        scenario: "Your organization's policies and procedures were last updated 5 years ago.",
        question_text: "What documentation requirement applies?",
        options: [
          { id: "a", label: "A", text: "Policies only need updating every 10 years" },
          { id: "b", label: "B", text: "Documentation must be retained for 6 years from creation or last effective date" },
          { id: "c", label: "C", text: "Policies can be discarded after 2 years" },
          { id: "d", label: "D", text: "Only breach-related documentation must be retained" },
        ],
        correct_answer: "b",
        rationale: "HIPAA requires that policies, procedures, and documentation be retained for 6 years from the date of creation or last effective date, whichever is later.",
        hipaa_section: "45 CFR §164.530(j)",
      },
    ],
  },
];

// Helper function to get quizzes for a workforce group
export function getQuizzesForWorkforceGroup(workforceGroup: WorkforceGroup): Quiz[] {
  return quizzes
    .filter(quiz => quiz.workforce_groups.includes(workforceGroup))
    .sort((a, b) => a.sequence_number - b.sequence_number);
}

// Helper function to get a specific quiz by ID
export function getQuizById(quizId: string): Quiz | undefined {
  return quizzes.find(quiz => quiz.id === quizId);
}

// Helper function to get required quiz IDs for a workforce group
export function getRequiredQuizIds(workforceGroup: WorkforceGroup): string[] {
  return getQuizzesForWorkforceGroup(workforceGroup).map(q => q.id);
}
