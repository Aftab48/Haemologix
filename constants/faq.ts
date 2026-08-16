import { ORG } from "@/lib/seo";

// FAQ content. Kept out of the client component so app/faq/layout.tsx can
// emit the same questions as FAQPage JSON-LD (server-side) without importing
// a "use client" module.

export interface FaqItem {
  question: string;
  answer: string;
}

export interface FaqCategory {
  title: string;
  items: FaqItem[];
}

export const faqCategories: FaqCategory[] = [
  {
    title: "General",
    items: [
      {
        question: "What is Haemologix?",
        answer: `${ORG.description} It also gives hospitals and blood banks donor-management and inventory tools.`,
      },
      {
        question: "Is Haemologix the same company as HaemaLogiX?",
        answer:
          "No. Haemologix (haemologix.in) is an Indian emergency blood-donation coordination platform based in Howrah, West Bengal. HaemaLogiX (haemalogix.com) is an unrelated Australian clinical-stage biotech developing immunotherapies for blood cancers. The two share nothing but a similar-sounding name.",
      },
      {
        question: "Where is Haemologix based and where does it operate?",
        answer:
          "Haemologix Private Limited is registered in Howrah, West Bengal, India, and serves hospitals, blood banks and donors across India.",
      },
      {
        question: "Is Haemologix a medical service provider?",
        answer:
          "No. Haemologix is a technology platform that facilitates connections between donors and hospitals. We do not provide medical advice, diagnosis, or treatment, and we do not verify the medical accuracy of user-provided information.",
      },
      {
        question: "Is there a cost to use Haemologix?",
        answer:
          "Donor registration and use of the platform is free. Hospitals and blood banks can join our pilot program at no cost; pricing for the full platform is available on our Pricing page.",
      },
      {
        question: "Which blood components does Haemologix cover?",
        answer:
          "Alerts can be raised for whole blood, plasma and platelets, for all ABO/Rh blood groups. Hospitals specify the blood group, number of units, urgency and search radius when they create a request.",
      },
      {
        question: "Which languages does Haemologix support?",
        answer:
          "The website and alerts are currently in English. Our support team can help you in English, Hindi and Bengali.",
      },
      {
        question: "How is Haemologix different from a WhatsApp group or social-media appeal?",
        answer:
          "Appeals on WhatsApp or social media reach whoever happens to see them, whenever they see them. Haemologix targets only donors whose blood group matches, who are within the hospital's radius, and who are eligible to donate today — and it tracks who has accepted so hospitals are not left guessing.",
      },
    ],
  },
  {
    title: "For Donors",
    items: [
      {
        question: "How do I register as a blood donor on Haemologix?",
        answer:
          "Go to haemologix.in/donor/onboard, enter your blood group, location and contact details, and you will receive alerts whenever a nearby hospital or blood bank needs your blood type.",
      },
      {
        question: "Who is eligible to register as a donor?",
        answer:
          "You must be between 18 and 65 years of age, weigh at least 50 kg, be in good general health, and have no medical conditions that would disqualify you from donating blood.",
      },
      {
        question: "How do emergency blood alerts work?",
        answer:
          "When a hospital raises an alert for a specific blood type, Haemologix notifies nearby eligible donors via SMS and email. If you accept a request, your contact information is shared with the requesting hospital so they can coordinate the donation.",
      },
      {
        question: "Am I obligated to donate once I accept a request?",
        answer:
          "By accepting a donation request, you commit to fulfilling it if you remain medically eligible. Emergency requests are time-sensitive, so repeatedly failing to honor accepted requests may result in account restrictions.",
      },
      {
        question: "Can I delete my account and data?",
        answer:
          "Yes. You can request deletion of your account and all associated data at any time from our account deletion page. Verified requests are completed within 30 days, in line with our Privacy Policy.",
      },
      {
        question: "How often can I donate blood?",
        answer:
          "Whole blood can generally be donated once every 90 days (three months). Haemologix records your last donation date and will not alert you for whole-blood requests until you are eligible again. Platelet donations have shorter intervals; follow the guidance of the collecting blood bank.",
      },
      {
        question: "Will I be paid for donating?",
        answer:
          "No. Haemologix connects voluntary, unpaid donors with hospitals, in line with Indian regulations and NBTC guidelines. Neither Haemologix nor participating hospitals pay for blood.",
      },
      {
        question: "Can I pause alerts for a while?",
        answer:
          "Yes. You can mark yourself unavailable from your donor profile (for example while travelling or unwell). You will not receive alerts while paused, and you can switch back to available at any time.",
      },
      {
        question: "What happens after I accept an alert?",
        answer:
          "The hospital sees that you have accepted along with your estimated travel time, and receives your contact details so it can confirm and guide you to the collection point. Bring a government photo ID; the hospital or blood bank will run its standard eligibility screening before collection.",
      },
    ],
  },
  {
    title: "For Hospitals & Blood Banks",
    items: [
      {
        question: "Who can register as a hospital or blood bank?",
        answer:
          "Any licensed medical facility with valid registration and license documents, and authorization to request blood donations, can register. All hospital and blood bank accounts are verified before they can raise alerts.",
      },
      {
        question: "How does a hospital raise an emergency blood request?",
        answer:
          "Register at haemologix.in/hospital/register, then create an alert with the blood group, units required, urgency and search radius. Haemologix matches and notifies eligible donors in real time.",
      },
      {
        question: "How do I join the pilot program?",
        answer:
          "You can apply through our Pilot page. The pilot is free, runs for 7-14 days, and includes onboarding support, training, and direct access to our team.",
      },
      {
        question: "What are our responsibilities when requesting blood?",
        answer:
          "Hospitals are responsible for verifying the urgency and legitimacy of blood requests, conducting appropriate medical screening of donors, and complying with all applicable medical and regulatory requirements.",
      },
      {
        question: "How quickly do donors respond to an alert?",
        answer:
          "Alerts are delivered within seconds of being raised. Response time depends on donor density in your area and the urgency you set; matched donors are notified immediately and you can watch acceptances arrive in real time on your dashboard and expand the radius if needed.",
      },
      {
        question: "Can we set different urgency levels?",
        answer:
          "Yes. Requests can be marked Low, Medium, High or Critical. Urgency affects how donors are notified and how the request is prioritised when a donor matches multiple alerts.",
      },
      {
        question: "Can a blood bank manage inventory on Haemologix?",
        answer:
          "Yes. Blood banks can record stock by component and blood group, set low-stock thresholds, and broadcast shortage alerts to nearby registered donors before stock runs out — not only after an emergency.",
      },
      {
        question: "Does Haemologix integrate with our hospital information system?",
        answer:
          "Not out of the box today. Alerts and inventory are managed through the Haemologix web dashboard. If you need HIS/LIS integration, contact us at founders@haemologix.in and we will discuss options.",
      },
    ],
  },
  {
    title: "Privacy & Data",
    items: [
      {
        question: "What data does Haemologix collect?",
        answer:
          "We collect information such as your name and contact details, medical information relevant to donation eligibility (blood type, hemoglobin levels, screening results), and usage data. Full details are in our Privacy Policy.",
      },
      {
        question: "Is Haemologix compliant with Indian data protection law?",
        answer:
          "Yes. Haemologix operates as a Data Fiduciary under India's Digital Personal Data Protection Act, 2023 (DPDPA), and follows consent-based processing, purpose limitation, and reasonable security safeguards.",
      },
      {
        question: "Who can see my medical information?",
        answer:
          "Your blood type, location, and eligibility status are shared only with verified hospitals and blood banks when they raise a relevant alert. Your contact information is shared only after you accept a donation request.",
      },
      {
        question: "Where is my data stored?",
        answer:
          "Data is stored on secure cloud infrastructure with encryption in transit and at rest. Access is restricted to authorised systems and staff, and processing follows the purpose limitation and security safeguards described in our Privacy Policy.",
      },
      {
        question: "Do you sell or share data with advertisers?",
        answer:
          "No. We never sell personal data and do not share it with advertisers. Data is shared only with the verified hospital or blood bank involved in a request you accepted, with service providers needed to run the platform (such as SMS and email delivery), or where required by law.",
      },
      {
        question: "How do I exercise my rights under the DPDPA?",
        answer:
          "You can access, correct or delete your data from your profile or the account deletion page, or by emailing founders@haemologix.in. We respond to verified requests within 30 days.",
      },
    ],
  },
];

/** Flat list, for FAQPage JSON-LD. */
export const allFaqs: FaqItem[] = faqCategories.flatMap((c) => c.items);
