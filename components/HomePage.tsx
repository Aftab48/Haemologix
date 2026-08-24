"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useUser } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import {
  ArrowRight,
  ArrowUpRight,
  Bell,
  Building2,
  CheckCircle2,
  Droplet,
  Hospital,
  Timer,
  Users,
} from "lucide-react";
import PasskeyModal from "@/components/PasskeyModal";
import Header from "@/components/Header";
import EditorialFooter from "@/components/EditorialFooter";
import { stats, features, steps, CarouselData } from "@/constants";
import { getCurrentUser } from "@/lib/actions/user.actions";
import editorial from "@/styles/editorial.module.css";
import styles from "./home.module.css";

// What each headline number actually counts. The values stay in @/constants;
// only the plain-language gloss lives here.
const statNotes: Record<string, string> = {
  "Lives Saved": "Requests closed with a matched donor on site.",
  "Active Donors": "Registered, eligibility-checked and alertable today.",
  "Partner Hospitals": "Raising requests and tracking responses live.",
  "Cities Covered": "Across India, in district towns as well as metros.",
};

// Mono codes and scope lines for the capability ledger, in the order the
// features are declared in @/constants.
const featureMeta = [
  { code: "ALERT", detail: "SMS · email · in-app" },
  { code: "MATCH", detail: "Blood group · distance · donation gap" },
  { code: "ROLES", detail: "Donor · hospital · blood bank · admin" },
  { code: "TRUST", detail: "OTP · encryption · access control" },
];

const midPoint = Math.ceil(CarouselData.length / 2);
const firstRowData = CarouselData.slice(0, midPoint);
const secondRowData = CarouselData.slice(midPoint);

const HomePage = () => {
  // Read ?admin=true after mount instead of via useSearchParams(): the hook
  // forces the whole page to bail out of server rendering, which left crawlers
  // with an empty "Loading..." shell. The passkey modal is client-only anyway.
  const [isAdmin, setIsAdmin] = useState(false);
  useEffect(() => {
    setIsAdmin(
      new URLSearchParams(window.location.search).get("admin") === "true"
    );
  }, []);

  const router = useRouter();
  const { user, isSignedIn } = useUser();
  const [role, setRole] = useState<CurrentUserResponse["role"]>(null);
  const [dbUser, setDbUser] = useState<CurrentUserResponse | null>(null);

  // Prefer DB registration id (alerts/inventory FK) over Clerk id in dashboard URLs
  const userId =
    dbUser?.user && "id" in dbUser.user && dbUser.user.id
      ? dbUser.user.id
      : user?.id;

  useEffect(() => {
    const fetchUser = async () => {
      if (!isSignedIn) return;

      const email = user?.primaryEmailAddress?.emailAddress;
      if (!email) return;

      try {
        const res = await getCurrentUser(email);
        setDbUser(res);
      } catch (err) {
        console.error("[Dashboard] error calling getCurrentUser:", err);
      }
    };

    fetchUser();
  }, [isSignedIn, user]);

  useEffect(() => {
    if (dbUser) {
      setRole(dbUser.role);
    }
  }, [dbUser]);

  const handleClick = (path: string) => {
    if (path.includes("admin")) {
      router.push(path);
      return;
    }
    // Register forms are reachable without login
    const isRegisterRoute = /^\/(donor|hospital|bloodbank)\/register/.test(path);
    if (isRegisterRoute || isSignedIn) {
      router.push(path);
    } else {
      router.push("/auth/sign-up");
    }
  };

  let dashboardMessage = "";
  let dashboardPath = "/";
  if (role === "DONOR") {
    dashboardPath = `/donor/${userId}`;
    dashboardMessage = "Open donor dashboard";
  }
  if (role === "HOSPITAL") {
    dashboardPath = `/hospital/${userId}`;
    dashboardMessage = "Open hospital dashboard";
  }

  const signedInWithRole = Boolean(isSignedIn && role);

  return (
    <div className={editorial.page}>
      <Header variant="editorial" />
      {isAdmin && <PasskeyModal />}

      <main>
        {/* ---------- hero ---------- */}
        <section className={editorial.hero}>
          <div className={editorial.frame}>
            <div className={editorial.metaBar}>
              <span>HAEMOLOGIX / EMERGENCY BLOOD NETWORK</span>
              <span>HOWRAH · INDIA</span>
              <span>HLX—HOME—01</span>
            </div>

            <div className={styles.heroGrid}>
              <div>
                <p className={editorial.eyebrow}>
                  BETWEEN THE REQUEST AND THE DONOR
                </p>
                <h1 className={editorial.display}>
                  Emergency blood in
                  <span className={editorial.slab}>
                    minutes
                    <Timer aria-hidden="true" />
                  </span>
                  not phone calls.
                </h1>
                <p className={editorial.lede}>
                  A hospital or blood bank raises one request. Haemologix matches it against
                  registered donors by blood group, distance and donation gap, and alerts them
                  instantly. Donors confirm in a tap, and the hospital sees who is coming.
                </p>

                {!signedInWithRole ? (
                  <>
                    <div className={styles.heroActions}>
                      <button
                        type="button"
                        onClick={() => handleClick("/donor/onboard")}
                        className={editorial.primaryAction}
                      >
                        Register as a donor
                        <Droplet aria-hidden="true" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleClick("/hospital/register")}
                        className={editorial.ghostAction}
                      >
                        Register a hospital
                        <Hospital aria-hidden="true" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleClick("/bloodbank/register")}
                        className={editorial.ghostAction}
                      >
                        Register a blood bank
                        <Building2 aria-hidden="true" />
                      </button>
                      <Link href="/pilot" className={editorial.ghostAction}>
                        Run a pilot
                        <ArrowUpRight aria-hidden="true" />
                      </Link>
                    </div>
                    <p className={styles.heroFootnote}>
                      DONOR REGISTRATION IS FREE, ALWAYS · NO APP INSTALL REQUIRED
                    </p>
                  </>
                ) : (
                  <div className={styles.heroActions}>
                    <button
                      type="button"
                      onClick={() => handleClick(dashboardPath)}
                      className={editorial.primaryAction}
                    >
                      {dashboardMessage}
                      <ArrowRight aria-hidden="true" />
                    </button>
                    <Link href="/impact" className={editorial.ghostAction}>
                      See the network
                      <ArrowUpRight aria-hidden="true" />
                    </Link>
                  </div>
                )}
              </div>

              <aside
                className={editorial.panel}
                aria-label="What happens after a request is raised"
              >
                <div className={editorial.panelHeader}>
                  <span>RESPONSE CLOCK</span>
                  <span>ELAPSED FROM REQUEST</span>
                </div>
                <div className={editorial.panelBody}>
                  <div className={styles.clockRow}>
                    <span className={styles.clockTime}>T+0:00</span>
                    <span className={styles.clockDot}>
                      <Hospital aria-hidden="true" />
                    </span>
                    <div>
                      <strong>Request raised</strong>
                      <small>Hospital or blood bank names the group and urgency</small>
                    </div>
                  </div>
                  <div className={styles.clockLink}>
                    <span>eligibility and distance checked</span>
                  </div>
                  <div className={styles.clockRow}>
                    <span className={styles.clockTime}>T+0:30</span>
                    <span className={`${styles.clockDot} ${styles.clockDotRuby}`}>
                      <Bell aria-hidden="true" />
                    </span>
                    <div>
                      <strong>Donors alerted</strong>
                      <small>Only those whose group is needed nearby</small>
                    </div>
                  </div>
                  <div className={styles.clockLink}>
                    <span>one tap to confirm</span>
                  </div>
                  <div className={styles.clockRow}>
                    <span className={styles.clockTime}>T+12:00</span>
                    <span className={`${styles.clockDot} ${styles.clockDotTeal}`}>
                      <CheckCircle2 aria-hidden="true" />
                    </span>
                    <div>
                      <strong>A donor is on the way</strong>
                      <small>The hospital sees who responded and when</small>
                    </div>
                  </div>
                </div>
                <div className={editorial.panelFooter}>
                  <span>THE OLD WAY</span>
                  <strong>Hours of calls and social-media appeals.</strong>
                </div>
              </aside>
            </div>
          </div>
        </section>

        {/* ---------- the numbers ---------- */}
        <section className={`${editorial.sectionTight} ${editorial.bandDeep}`}>
          <div className={editorial.frame}>
            <header className={editorial.sectionHeading}>
              <p>THE NETWORK SO FAR</p>
              <h2 className={editorial.h2}>Counted, not claimed.</h2>
            </header>

            <div className={styles.numbers}>
              {stats.map((stat) => (
                <div key={stat.label}>
                  <span>{stat.label}</span>
                  <strong>{stat.value}</strong>
                  <small>{statNotes[stat.label]}</small>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ---------- capabilities ---------- */}
        <section className={`${editorial.section} ${editorial.bandTeal}`}>
          <div className={editorial.frame}>
            <header className={editorial.sectionHeading}>
              <p>WHAT THE PLATFORM DOES</p>
              <h2 className={editorial.h2}>Four jobs, done quietly.</h2>
            </header>

            <div className={editorial.rowList}>
              {features.map((feature, index) => (
                <article className={editorial.row} key={feature.title}>
                  <span className={editorial.code}>
                    {featureMeta[index]?.code ?? "CORE"}
                  </span>
                  <h3>{feature.title}</h3>
                  <p>{feature.description}</p>
                  <small>{featureMeta[index]?.detail}</small>
                </article>
              ))}
            </div>
          </div>
        </section>

        {/* ---------- how it works ---------- */}
        <section className={`${editorial.section} ${editorial.bandInk}`}>
          <div className={editorial.frame}>
            <p className={editorial.darkEyebrow}>ONE REQUEST / FIVE MOVES</p>
            <h2 className={editorial.h2}>How a unit gets found.</h2>
            <p className={editorial.sectionNote}>
              The steps run in order every time. Nothing waits on someone remembering to make
              the next phone call.
            </p>

            <ol className={styles.sequence}>
              {steps.map((item) => (
                <li key={item.step}>
                  <span>STEP {item.step.padStart(2, "0")}</span>
                  <h3>{item.title}</h3>
                  <p>{item.description}</p>
                </li>
              ))}
            </ol>
          </div>
        </section>

        {/* ---------- community ---------- */}
        <section className={editorial.sectionTight}>
          <div className={editorial.frame}>
            <header className={editorial.sectionHeading}>
              <p>WHO IS ON THE NETWORK</p>
              <h2 className={editorial.h2}>Hospitals, blood banks, donors.</h2>
            </header>
          </div>

          <div className={styles.sheet}>
            <div className={`${styles.sheetFade} ${styles.sheetFadeLeft}`} aria-hidden="true" />
            <div className={`${styles.sheetFade} ${styles.sheetFadeRight}`} aria-hidden="true" />

            <div className={`${styles.sheetRow} ${styles.scrollLeft}`}>
              {[...firstRowData, ...firstRowData, ...firstRowData].map((item, index) => (
                <figure className={styles.tile} key={`row1-${index}`}>
                  <Image
                    src={item.image || "/placeholder.svg"}
                    alt={item.title}
                    fill
                    unoptimized
                    sizes="288px"
                  />
                  <figcaption className={styles.tileCaption}>
                    <span>{item.type}</span>
                    <strong>{item.title}</strong>
                  </figcaption>
                </figure>
              ))}
            </div>

            <div className={`${styles.sheetRow} ${styles.scrollRight}`}>
              {[...secondRowData, ...secondRowData, ...secondRowData].map((item, index) => (
                <figure className={styles.tile} key={`row2-${index}`}>
                  <Image
                    src={item.image || "/placeholder.svg"}
                    alt={item.title}
                    fill
                    unoptimized
                    sizes="288px"
                  />
                  <figcaption className={styles.tileCaption}>
                    <span>{item.type}</span>
                    <strong>{item.title}</strong>
                  </figcaption>
                </figure>
              ))}
            </div>
          </div>
        </section>

        {/* ---------- closing ---------- */}
        <section className={`${editorial.closing} ${editorial.bandRuby}`}>
          <div className={editorial.frame}>
            <div className={editorial.closingBlock}>
              <span className={editorial.label}>HAEMOLOGIX / JOIN</span>
              <h2>Be the reason it only took minutes.</h2>
              <p>
                Registering as a donor takes about two minutes. You are alerted only when your
                blood group is needed near you.
              </p>
              {signedInWithRole ? (
                <button
                  type="button"
                  onClick={() => handleClick(dashboardPath)}
                  className={editorial.lightAction}
                >
                  {dashboardMessage}
                  <ArrowRight aria-hidden="true" />
                </button>
              ) : (
                <Link href="/donor/onboard" className={editorial.lightAction}>
                  Register as a donor
                  <Users aria-hidden="true" />
                </Link>
              )}
            </div>
          </div>
        </section>
      </main>

      <EditorialFooter />
    </div>
  );
};

export default HomePage;
