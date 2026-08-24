"use client";

import { useState } from "react";
import Link from "next/link";
import {
  ArrowUpRight,
  Check,
  Mail,
  MapPin,
  MessageCircle,
  Phone,
  Send,
} from "lucide-react";
import Header from "@/components/Header";
import EditorialFooter from "@/components/EditorialFooter";
import editorial from "@/styles/editorial.module.css";
import styles from "./contact.module.css";

// Metadata lives in ./layout.tsx.

const channels = [
  {
    code: "EMAIL",
    icon: Mail,
    title: "Email",
    copy: "Best for partnership enquiries, pilots and anything with detail attached.",
    links: [{ href: "mailto:founders@haemologix.in", label: "founders@haemologix.in" }],
    note: "Replies within one working day",
  },
  {
    code: "PHONE",
    icon: Phone,
    title: "Phone",
    copy: "For urgent blood requests and anything a hospital needs resolved now.",
    links: [
      { href: "tel:+919903776046", label: "+91 99037 76046" },
      { href: "tel:+919874712191", label: "+91 98747 12191" },
    ],
    note: "Emergency line staffed 24/7",
  },
  {
    code: "WHATSAPP",
    icon: MessageCircle,
    title: "WhatsApp",
    copy: "Quick questions, screenshots and follow-ups on an existing request.",
    links: [{ href: "https://wa.me/919903776046", label: "Chat on WhatsApp" }],
    note: "+91 99037 76046",
  },
];

const hours = [
  {
    label: "Emergency",
    value: "24 / 7",
    copy: "Blood requests are answered at any hour, every day of the year.",
  },
  {
    label: "Office",
    value: "Mon–Fri",
    copy: "09:00 to 18:00 IST for partnerships, billing and onboarding.",
  },
  {
    label: "Weekend",
    value: "Sat–Sun",
    copy: "10:00 to 16:00 IST for non-urgent questions and support.",
  },
];

export default function ContactPage() {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    message: "",
    acceptTerms: false,
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitStatus, setSubmitStatus] = useState<{
    type: "success" | "error" | null;
    message: string;
  }>({ type: null, message: "" });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setSubmitStatus({ type: null, message: "" });

    try {
      const response = await fetch("/api/contact", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (data.success) {
        setSubmitStatus({
          type: "success",
          message:
            data.message || "Thank you for contacting us! We'll get back to you soon.",
        });
        // Reset form
        setFormData({
          name: "",
          email: "",
          message: "",
          acceptTerms: false,
        });
      } else {
        setSubmitStatus({
          type: "error",
          message: data.error || "Something went wrong. Please try again.",
        });
      }
    } catch (error) {
      console.error("Error submitting contact form:", error);
      setSubmitStatus({
        type: "error",
        message:
          "Failed to send message. Please try again later or contact us directly.",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className={editorial.page}>
      <Header activePage="contact" variant="editorial" />

      <main>
        {/* ---------- hero ---------- */}
        <section className={editorial.hero}>
          <div className={editorial.frame}>
            <div className={editorial.metaBar}>
              <span>CONTACT / HAEMOLOGIX</span>
              <span>KOLKATA · INDIA</span>
              <span>HLX—CONTACT—01</span>
            </div>

            <div className={styles.heroGrid}>
              <div>
                <p className={editorial.eyebrow}>EMERGENCY SUPPORT · PARTNERSHIPS · GENERAL</p>
                <h1 className={editorial.display}>
                  Reach a
                  <span className={editorial.slab}>
                    person
                    <MessageCircle aria-hidden="true" />
                  </span>
                  not a queue.
                </h1>
                <p className={editorial.lede}>
                  If blood is needed now, call the emergency line. For everything else — pilots,
                  partnerships, billing, or a question about how the platform works — pick
                  whichever channel suits you.
                </p>
                <div className={editorial.actions}>
                  <a href="tel:+919903776046" className={editorial.primaryAction}>
                    Call the emergency line
                    <Phone aria-hidden="true" />
                  </a>
                  <Link href="#message" className={editorial.textAction}>
                    Send a message instead
                    <ArrowUpRight aria-hidden="true" />
                  </Link>
                </div>
              </div>

              <aside className={editorial.panel} aria-label="Ways to reach Haemologix">
                <div className={editorial.panelHeader}>
                  <span>SWITCHBOARD</span>
                  <span>ALL LINES</span>
                </div>
                <div className={editorial.panelBody}>
                  <dl className={styles.switchboard}>
                    <div>
                      <dt>Emergency</dt>
                      <dd>
                        <a href="tel:+919903776046">+91 99037 76046</a>
                      </dd>
                      <span className={styles.liveTag}>24/7</span>
                    </div>
                    <div>
                      <dt>Secondary</dt>
                      <dd>
                        <a href="tel:+919874712191">+91 98747 12191</a>
                      </dd>
                      <span />
                    </div>
                    <div>
                      <dt>WhatsApp</dt>
                      <dd>
                        <a
                          href="https://wa.me/919903776046"
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          Chat now
                        </a>
                      </dd>
                      <span />
                    </div>
                    <div>
                      <dt>Email</dt>
                      <dd>
                        <a href="mailto:founders@haemologix.in">founders@haemologix.in</a>
                      </dd>
                      <span />
                    </div>
                    <div>
                      <dt>Based</dt>
                      <dd>Kolkata, India</dd>
                      <span />
                    </div>
                  </dl>
                </div>
                <div className={editorial.panelFooter}>
                  <span>IF IT IS URGENT</span>
                  <strong>Call. Do not wait on a form.</strong>
                </div>
              </aside>
            </div>
          </div>
        </section>

        {/* ---------- message form ---------- */}
        <section id="message" className={`${editorial.section} ${editorial.bandInk}`}>
          <div className={editorial.frame}>
            <div className={styles.formGrid}>
              <div className={styles.formIntro}>
                <p className={editorial.darkEyebrow}>SEND A MESSAGE</p>
                <h2 className={editorial.h2}>Write to us.</h2>
                <p>
                  Three fields. Tell us who you are and what you need, and the right person
                  answers — not an autoresponder.
                </p>
                <dl>
                  <div>
                    <dt>Response time</dt>
                    <dd>One working day</dd>
                  </div>
                  <div>
                    <dt>Goes to</dt>
                    <dd>The founders</dd>
                  </div>
                  <div>
                    <dt>Not for</dt>
                    <dd>Live emergencies — call instead</dd>
                  </div>
                </dl>
              </div>

              <form className={styles.form} onSubmit={handleSubmit}>
                <div className={styles.formRow}>
                  <div className={editorial.field}>
                    <label className={editorial.fieldLabel} htmlFor="name">
                      Name
                    </label>
                    <input
                      id="name"
                      className={editorial.input}
                      type="text"
                      placeholder="Your name"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      required
                    />
                  </div>

                  <div className={editorial.field}>
                    <label className={editorial.fieldLabel} htmlFor="email">
                      Email
                    </label>
                    <input
                      id="email"
                      className={editorial.input}
                      type="email"
                      placeholder="you@example.com"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      required
                    />
                  </div>
                </div>

                <div className={editorial.field}>
                  <label className={editorial.fieldLabel} htmlFor="message">
                    Message
                  </label>
                  <textarea
                    id="message"
                    className={editorial.textarea}
                    placeholder="Tell us how we can help."
                    value={formData.message}
                    onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                    required
                  />
                </div>

                <label
                  className={`${styles.consent} ${
                    formData.acceptTerms ? styles.consentOn : ""
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={formData.acceptTerms}
                    onChange={(e) =>
                      setFormData({ ...formData, acceptTerms: e.target.checked })
                    }
                  />
                  <span className={styles.consentBox} aria-hidden="true">
                    <Check />
                  </span>
                  <span>
                    I accept the{" "}
                    <Link href="/terms-and-conditions">Terms of Service</Link>.
                  </span>
                </label>

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
                  disabled={!formData.acceptTerms || isSubmitting}
                >
                  {isSubmitting ? (
                    "Sending…"
                  ) : (
                    <>
                      Send message
                      <Send aria-hidden="true" />
                    </>
                  )}
                </button>
              </form>
            </div>
          </div>
        </section>

        {/* ---------- channels ---------- */}
        <section className={`${editorial.sectionTight} ${editorial.bandDeep}`}>
          <div className={editorial.frame}>
            <header className={editorial.sectionHeading}>
              <p>OTHER WAYS THROUGH</p>
              <h2 className={editorial.h2}>Pick the line that fits.</h2>
            </header>

            <ul className={`${editorial.cardGrid} ${editorial.cols3}`}>
              {channels.map((channel) => (
                <li key={channel.code} className={styles.channel}>
                  <span className={editorial.code}>{channel.code}</span>
                  <div>
                    <h3 className={editorial.h3}>{channel.title}</h3>
                    <p>{channel.copy}</p>
                    <div className={styles.channelLinks}>
                      {channel.links.map((link) => (
                        <a
                          key={link.href}
                          href={link.href}
                          {...(link.href.startsWith("http")
                            ? { target: "_blank", rel: "noopener noreferrer" }
                            : {})}
                        >
                          {link.label}
                          <ArrowUpRight aria-hidden="true" />
                        </a>
                      ))}
                      <span>{channel.note}</span>
                    </div>
                  </div>
                  <channel.icon aria-hidden="true" className={editorial.cardIcon} />
                </li>
              ))}
            </ul>
          </div>
        </section>

        {/* ---------- hours ---------- */}
        <section className={`${editorial.sectionTight} ${editorial.bandTeal}`}>
          <div className={editorial.frame}>
            <header className={editorial.sectionHeading}>
              <p>WHEN WE ANSWER</p>
              <h2 className={editorial.h2}>Hours, plainly.</h2>
            </header>

            <dl className={styles.hours}>
              {hours.map((entry) => (
                <div key={entry.label}>
                  <dt>{entry.label}</dt>
                  <dd>{entry.value}</dd>
                  <p>{entry.copy}</p>
                </div>
              ))}
            </dl>
          </div>
        </section>

        {/* ---------- closing ---------- */}
        <section className={`${editorial.closing} ${editorial.bandRuby}`}>
          <div className={editorial.frame}>
            <div className={editorial.closingBlock}>
              <span className={editorial.label}>HAEMOLOGIX / VISIT</span>
              <h2>Registered in Howrah, working across India.</h2>
              <p>
                Haemologix Private Limited, Howrah, West Bengal. Partner hospitals and blood
                banks are onboarded remotely, wherever they are.
              </p>
              <Link href="/pilot" className={editorial.lightAction}>
                Start a pilot
                <MapPin aria-hidden="true" />
              </Link>
            </div>
          </div>
        </section>
      </main>

      <EditorialFooter />
    </div>
  );
}
