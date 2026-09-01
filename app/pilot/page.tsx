"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import {
  ArrowDown,
  ArrowUpRight,
  Bell,
  Check,
  DollarSign,
  FileText,
  Plus,
  Rocket,
  Shield,
  Users,
} from "lucide-react";
import Header from "@/components/Header";
import EditorialFooter from "@/components/EditorialFooter";
import { usePageView } from "@/hooks/usePageView";
import editorial from "@/styles/editorial.module.css";
import styles from "./pilot.module.css";

// Metadata lives in ./layout.tsx.

interface PilotFormData {
  hospitalName: string;
  contactPerson: string;
  email: string;
  phone: string;
  location: string;
  hasBloodBank: string;
}

const pilotTerms = [
  {
    label: "Length",
    value: "7–14 days",
    copy: "Long enough to see real requests move through the platform.",
  },
  {
    label: "Cost",
    value: "Free",
    copy: "No setup fee, no licence, no infrastructure to buy.",
  },
  {
    label: "Setup",
    value: "Zero",
    copy: "A dashboard is provisioned for you; nothing is installed on site.",
  },
  {
    label: "You get",
    value: "A report",
    copy: "Usage and response figures at the end, whatever you decide next.",
  },
];

const hospitalFeatures = [
  {
    code: "DETECT",
    icon: Rocket,
    title: "Shortage detection",
    copy: "Blood shortages are flagged before they turn critical.",
    detail: "Inventory · thresholds · forecasting",
  },
  {
    code: "MOBILISE",
    icon: Bell,
    title: "Instant donor mobilisation",
    copy: "Verified donors nearby are alerted in seconds, not phone calls.",
    detail: "SMS · email · in-app",
  },
  {
    code: "EXCHANGE",
    icon: Check,
    title: "Inter-hospital unit exchange",
    copy: "Coordinate unit transfers between hospitals without a chain of calls.",
    detail: "Requests · transfers · confirmations",
  },
  {
    code: "COMPLY",
    icon: Shield,
    title: "Regulatory-grade compliance",
    copy: "Built around Indian healthcare regulation and DPDPA obligations.",
    detail: "Consent · retention · access control",
  },
  {
    code: "TRACE",
    icon: FileText,
    title: "Full traceability",
    copy: "Every unit and every donation carries its own record and analytics.",
    detail: "Audit trail · reporting",
  },
  {
    code: "HOST",
    icon: DollarSign,
    title: "Zero infrastructure burden",
    copy: "No hardware and no server room. Everything runs in the cloud.",
    detail: "Hosted · maintained · monitored",
  },
];

const pilotInclusions = [
  "Temporary hospital dashboard, valid for two weeks",
  "AI-based donor verification, up to 30 donors",
  "Sample request workflow, up to 2 real requests",
  "SMS and email alerts on a limited quota",
  "Auto-generated feedback and usage reports",
  "Full autonomous agent access, up to 2 blood alerts",
];

const faqItems = [
  {
    question: "Who can apply for the pilot programme?",
    answer:
      "Hospitals and blood banks of any size can apply. We are looking for institutions that want to improve their blood coordination and donor management. Both small clinics and large hospitals are welcome.",
  },
  {
    question: "Is there a cost to join the pilot?",
    answer:
      "No. The pilot is free — no cost, no setup fees and no infrastructure requirements. We provide everything you need to test the platform during the 7–14 day trial.",
  },
  {
    question: "What happens after the pilot?",
    answer:
      "You receive a detailed performance report. If you are satisfied, you can continue on the full platform. Pilot participants get priority access and special onboarding rates for the production version.",
  },
  {
    question: "What support do we get during the pilot?",
    answer:
      "Dedicated onboarding, including training sessions, documentation and direct access to our support team. We set up your dashboard and walk you through the first few blood alerts.",
  },
  {
    question: "Can we extend the pilot period?",
    answer:
      "Yes. If you need more time to evaluate, we can extend the pilot case by case. Ask our team during your trial.",
  },
];

export default function PilotPage() {
  const { trackEvent } = usePageView("/pilot", true);
  const formRef = useRef<HTMLDivElement>(null);

  // Track page view with UTM parameters
  useEffect(() => {
    const trackPageView = async () => {
      const urlParams = new URLSearchParams(window.location.search);
      const utmSource = urlParams.get("utm_source");
      const utmMedium = urlParams.get("utm_medium");
      const utmCampaign = urlParams.get("utm_campaign");
      const utmContent = urlParams.get("utm_content");

      // Track QR scan if utm_medium is qr_code
      if (utmMedium === "qr_code") {
        try {
          await fetch("/api/pilot-analytics", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              eventType: "qr_scan",
              utmSource,
              utmMedium,
              utmCampaign,
              utmContent,
              referrer: document.referrer || undefined,
              metadata: {
                path: window.location.pathname,
                fullUrl: window.location.href,
                qrLocation: utmContent || "unknown",
              },
            }),
          });
        } catch (error) {
          console.error("Error tracking QR scan:", error);
        }
      }

      // Track page view if there are UTM parameters (indicating QR scan or campaign)
      if (utmSource || utmMedium || utmCampaign || utmContent) {
        try {
          await fetch("/api/pilot-analytics", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              eventType: "page_view",
              utmSource,
              utmMedium,
              utmCampaign,
              utmContent,
              referrer: document.referrer || undefined,
              metadata: {
                path: window.location.pathname,
                fullUrl: window.location.href,
              },
            }),
          });
          trackEvent("pilot_page_view", {
            utm_medium: utmMedium,
            utm_source: utmSource,
          });
        } catch (error) {
          console.error("Error tracking page view:", error);
        }
      }
    };

    trackPageView();
  }, [trackEvent]);

  const [formData, setFormData] = useState<PilotFormData>({
    hospitalName: "",
    contactPerson: "",
    email: "",
    phone: "",
    location: "",
    hasBloodBank: "",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitStatus, setSubmitStatus] = useState<{
    type: "success" | "error" | null;
    message: string;
  }>({ type: null, message: "" });

  const scrollToForm = () => {
    trackEvent("cta_click", { action: "get_started" });
    formRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setSubmitStatus({ type: null, message: "" });

    try {
      const response = await fetch("/api/pilot-request", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ...formData,
          hasBloodBank: formData.hasBloodBank === "yes",
        }),
      });

      const data = await response.json();

      if (data.success) {
        setSubmitStatus({
          type: "success",
          message: data.message || "Pilot request submitted successfully!",
        });
        trackEvent("form_submission", { status: "success" });

        // Track form submission with UTM parameters
        const urlParams = new URLSearchParams(window.location.search);
        try {
          await fetch("/api/pilot-analytics", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              eventType: "form_submission",
              utmSource: urlParams.get("utm_source"),
              utmMedium: urlParams.get("utm_medium"),
              utmCampaign: urlParams.get("utm_campaign"),
              utmContent: urlParams.get("utm_content"),
              referrer: document.referrer || undefined,
              metadata: {
                hospitalName: formData.hospitalName,
                hasBloodBank: formData.hasBloodBank === "yes",
              },
            }),
          });
        } catch (error) {
          console.error("Error tracking form submission:", error);
        }

        // Reset form
        setFormData({
          hospitalName: "",
          contactPerson: "",
          email: "",
          phone: "",
          location: "",
          hasBloodBank: "",
        });
      } else {
        setSubmitStatus({
          type: "error",
          message: data.error || "Failed to submit request. Please try again.",
        });
        trackEvent("form_submission", { status: "error", error: data.error });
      }
    } catch {
      setSubmitStatus({
        type: "error",
        message: "An error occurred. Please try again later.",
      });
      trackEvent("form_submission", { status: "error", error: "network_error" });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className={editorial.page}>
      <Header activePage="pilot" variant="editorial" />

      <main>
        {/* ---------- hero ---------- */}
        <section className={editorial.hero}>
          <div className={editorial.frame}>
            <div className={editorial.metaBar}>
              <span>PILOT / HAEMOLOGIX</span>
              <span>HOSPITALS &amp; BLOOD BANKS</span>
              <span>HLX—PILOT—01</span>
            </div>

            <div className={styles.heroGrid}>
              <div>
                <p className={editorial.eyebrow}>A 7–14 DAY VALIDATION PROGRAMME</p>
                <h1 className={editorial.display}>
                  Try it on a
                  <span className={editorial.slab}>
                    real ward
                    <Rocket aria-hidden="true" />
                  </span>
                  for two weeks.
                </h1>
                <p className={editorial.lede}>
                  Run Haemologix at your hospital or blood bank with nothing to install and
                  nothing to pay. You get a working dashboard, live donor alerts and a report at
                  the end.
                </p>
                <div className={editorial.actions}>
                  <button
                    type="button"
                    onClick={scrollToForm}
                    className={editorial.primaryAction}
                  >
                    Request pilot access
                    <ArrowDown aria-hidden="true" />
                  </button>
                  <Link href="/pricing" className={editorial.textAction}>
                    See what comes after
                    <ArrowUpRight aria-hidden="true" />
                  </Link>
                </div>
              </div>

              <aside className={styles.scanCard} aria-label="Scan to register for the pilot">
                <div className={styles.scanHead}>
                  <span>SCAN TO REGISTER</span>
                  <span>HLX—QR</span>
                </div>
                <div className={styles.scanBody}>
                  <Image
                    src="/qr-code-hero.png"
                    alt="QR code linking to the Haemologix pilot registration form"
                    width={268}
                    height={268}
                    priority
                  />
                </div>
                <div className={styles.scanFoot}>
                  <span>OR</span>
                  <strong>Fill the form further down this page.</strong>
                </div>
              </aside>
            </div>
          </div>
        </section>

        {/* ---------- terms ---------- */}
        <section className={`${editorial.sectionTight} ${editorial.bandTeal}`}>
          <div className={editorial.frame}>
            <header className={editorial.sectionHeading}>
              <p>THE TERMS, IN FULL</p>
              <h2 className={editorial.h2}>What you are agreeing to.</h2>
            </header>

            <dl className={styles.termsGrid}>
              {pilotTerms.map((term) => (
                <div key={term.label}>
                  <dt>{term.label}</dt>
                  <dd>{term.value}</dd>
                  <p>{term.copy}</p>
                </div>
              ))}
            </dl>
          </div>
        </section>

        {/* ---------- capabilities ---------- */}
        <section className={editorial.section}>
          <div className={editorial.frame}>
            <header className={editorial.sectionHeading}>
              <p>WHAT YOU ARE EVALUATING</p>
              <h2 className={editorial.h2}>An emergency command centre.</h2>
            </header>

            <ul className={editorial.cardGrid}>
              {hospitalFeatures.map((feature) => (
                <li key={feature.code}>
                  <span className={editorial.code}>{feature.code}</span>
                  <div>
                    <h3 className={editorial.h3}>{feature.title}</h3>
                    <p>{feature.copy}</p>
                  </div>
                  <feature.icon aria-hidden="true" className={editorial.cardIcon} />
                </li>
              ))}
            </ul>
          </div>
        </section>

        {/* ---------- inclusions ---------- */}
        <section className={`${editorial.sectionTight} ${editorial.bandDeep}`}>
          <div className={editorial.frame}>
            <header className={editorial.sectionHeading}>
              <p>INCLUDED / AND THE LIMITS ON EACH</p>
              <h2 className={editorial.h2}>Exactly what is switched on.</h2>
            </header>

            <ul className={styles.inclusions}>
              {pilotInclusions.map((inclusion) => (
                <li key={inclusion}>
                  <Check aria-hidden="true" />
                  <span>{inclusion}</span>
                </li>
              ))}
            </ul>
          </div>
        </section>

        {/* ---------- form ---------- */}
        <section
          ref={formRef}
          className={`${editorial.section} ${editorial.bandInk}`}
          style={{ scrollMarginTop: "80px" }}
          id="request"
        >
          <div className={editorial.frame}>
            <div className={styles.formGrid}>
              <div className={styles.formIntro}>
                <p className={editorial.darkEyebrow}>REQUEST PILOT ACCESS</p>
                <h2 className={editorial.h2}>Tell us where.</h2>
                <p>
                  Six fields. We reply with a date for onboarding and the dashboard credentials
                  for your team.
                </p>
                <ul>
                  <li>
                    <Check aria-hidden="true" />
                    <span>No payment details requested at any point.</span>
                  </li>
                  <li>
                    <Check aria-hidden="true" />
                    <span>Your details are used to set up the pilot, nothing else.</span>
                  </li>
                  <li>
                    <Check aria-hidden="true" />
                    <span>You can stop the pilot at any time.</span>
                  </li>
                </ul>
              </div>

              <form className={styles.form} onSubmit={handleSubmit}>
                <div className={styles.formRow}>
                  <div className={editorial.field}>
                    <label className={editorial.fieldLabel} htmlFor="hospitalName">
                      Hospital name *
                    </label>
                    <input
                      id="hospitalName"
                      className={editorial.input}
                      type="text"
                      placeholder="Enter hospital name"
                      value={formData.hospitalName}
                      onChange={(e) =>
                        setFormData({ ...formData, hospitalName: e.target.value })
                      }
                      required
                    />
                  </div>

                  <div className={editorial.field}>
                    <label className={editorial.fieldLabel} htmlFor="contactPerson">
                      Contact person *
                    </label>
                    <input
                      id="contactPerson"
                      className={editorial.input}
                      type="text"
                      placeholder="Full name"
                      value={formData.contactPerson}
                      onChange={(e) =>
                        setFormData({ ...formData, contactPerson: e.target.value })
                      }
                      required
                    />
                  </div>
                </div>

                <div className={styles.formRow}>
                  <div className={editorial.field}>
                    <label className={editorial.fieldLabel} htmlFor="email">
                      Email *
                    </label>
                    <input
                      id="email"
                      className={editorial.input}
                      type="email"
                      placeholder="hospital@example.com"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      required
                    />
                  </div>

                  <div className={editorial.field}>
                    <label className={editorial.fieldLabel} htmlFor="phone">
                      Phone *
                    </label>
                    <input
                      id="phone"
                      className={editorial.input}
                      type="tel"
                      placeholder="+91 1234567890"
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      required
                    />
                  </div>
                </div>

                <div className={editorial.field}>
                  <label className={editorial.fieldLabel} htmlFor="location">
                    Location *
                  </label>
                  <input
                    id="location"
                    className={editorial.input}
                    type="text"
                    placeholder="City, state, country"
                    value={formData.location}
                    onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                    required
                  />
                </div>

                <fieldset className={editorial.field} style={{ border: 0, padding: 0, margin: 0 }}>
                  <legend className={editorial.fieldLabel}>Do you have a blood bank? *</legend>
                  <div className={styles.choice}>
                    {[
                      { value: "yes", label: "Yes" },
                      { value: "no", label: "No" },
                    ].map((option) => (
                      <label
                        key={option.value}
                        className={`${styles.choiceOption} ${
                          formData.hasBloodBank === option.value ? styles.choiceOptionOn : ""
                        }`}
                      >
                        <input
                          type="radio"
                          name="hasBloodBank"
                          value={option.value}
                          checked={formData.hasBloodBank === option.value}
                          onChange={(e) =>
                            setFormData({ ...formData, hasBloodBank: e.target.value })
                          }
                        />
                        {option.label}
                      </label>
                    ))}
                  </div>
                </fieldset>

                {submitStatus.type ? (
                  <p
                    className={`${editorial.formNote} ${
                      submitStatus.type === "error" ? editorial.formNoteError : ""
                    }`}
                    role="status"
                  >
                    {submitStatus.message}
                  </p>
                ) : null}

                <button
                  type="submit"
                  className={editorial.submit}
                  disabled={isSubmitting || !formData.hasBloodBank}
                >
                  {isSubmitting ? "Submitting…" : "Request pilot access"}
                </button>
              </form>
            </div>
          </div>
        </section>

        {/* ---------- faq ---------- */}
        <section className={editorial.section}>
          <div className={editorial.frame}>
            <div className={styles.faqGrid}>
              <div className={styles.faqIntro}>
                <p className={editorial.eyebrow}>BEFORE YOU ASK</p>
                <h2 className={editorial.h2}>Pilot questions.</h2>
                <p>
                  Anything not covered here,{" "}
                  <Link href="/contact" className={editorial.textAction}>
                    ask us directly
                  </Link>
                  .
                </p>
              </div>

              <div className={editorial.accordion}>
                {faqItems.map((faq) => (
                  <details
                    className={editorial.accordionItem}
                    key={faq.question}
                    onToggle={(e) => {
                      if ((e.currentTarget as HTMLDetailsElement).open) {
                        trackEvent("faq_toggle", { question: faq.question });
                      }
                    }}
                  >
                    <summary>
                      {faq.question}
                      <Plus aria-hidden="true" />
                    </summary>
                    <p>{faq.answer}</p>
                  </details>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* ---------- closing ---------- */}
        <section className={`${editorial.closing} ${editorial.bandRuby}`}>
          <div className={editorial.frame}>
            <div className={styles.closingScan}>
              <div>
                <span className={editorial.label}>HAEMOLOGIX / PILOT</span>
                <h2>Join the lifeline network.</h2>
                <p>
                  Still sceptical? We would rather show you than tell you. Two weeks, no cost,
                  your own ward.
                </p>
                <div className={styles.closingActions}>
                  <button
                    type="button"
                    onClick={scrollToForm}
                    className={editorial.lightAction}
                  >
                    Request pilot access
                    <Users aria-hidden="true" />
                  </button>
                  <Link href="/contact" className={editorial.textAction}>
                    Contact the team
                    <ArrowUpRight aria-hidden="true" />
                  </Link>
                </div>
              </div>

              <div className={styles.closingQr}>
                <Image
                  src="/qr-code-footer.png"
                  alt="QR code linking to the Haemologix pilot registration form"
                  width={192}
                  height={192}
                />
              </div>
            </div>
          </div>
        </section>
      </main>

      <EditorialFooter />
    </div>
  );
}
