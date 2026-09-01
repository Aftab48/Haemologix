"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useUser } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import {
  Activity,
  ArrowDown,
  ArrowRight,
  ArrowUpRight,
  Bell,
  CheckCircle2,
  CircleAlert,
  Droplet,
  HeartPulse,
  Hospital,
  MapPin,
  Navigation,
  Radio,
  ShieldCheck,
  Smartphone,
  Timer,
  Users,
} from "lucide-react";
import {
  motion,
  useReducedMotion,
  useScroll,
  useSpring,
  useTransform,
} from "framer-motion";
import PasskeyModal from "@/components/PasskeyModal";
import Header from "@/components/Header";
import EditorialFooter from "@/components/EditorialFooter";
import { stats, features, steps, CarouselData } from "@/constants";
import { getCurrentUser } from "@/lib/actions/user.actions";
import editorial from "@/styles/editorial.module.css";
import styles from "./home.module.css";

const statNotes: Record<string, string> = {
  "Lives Saved": "Matched requests",
  "Active Donors": "Ready to respond",
  "Partner Hospitals": "Connected live",
  "Cities Covered": "Across India",
};

const featureMeta = [
  { code: "ALERT", detail: "SMS · email · in-app" },
  { code: "MATCH", detail: "Blood group · distance · donation gap" },
  { code: "ROLES", detail: "Donor · hospital · blood bank · admin" },
  { code: "TRUST", detail: "OTP · encryption · access control" },
];

const journeyIcons = [Hospital, Bell, Smartphone, Navigation, HeartPulse];

const signalNodes = [
  { label: "Request", time: "T+0:00", Icon: Hospital },
  { label: "Match", time: "T+0:08", Icon: MapPin },
  { label: "Alert", time: "T+0:30", Icon: Radio },
  { label: "Confirmed", time: "T+12:00", Icon: CheckCircle2 },
];

const midPoint = Math.ceil(CarouselData.length / 2);
const firstRowData = CarouselData.slice(0, midPoint);
const secondRowData = CarouselData.slice(midPoint);

const reveal = {
  hidden: { opacity: 0, y: 36 },
  visible: { opacity: 1, y: 0 },
};

const HomePage = () => {
  const [isAdmin, setIsAdmin] = useState(false);
  const [activeSignal, setActiveSignal] = useState(0);
  const shouldReduceMotion = useReducedMotion();
  const router = useRouter();
  const { user, isSignedIn } = useUser();
  const [role, setRole] = useState<CurrentUserResponse["role"]>(null);
  const [dbUser, setDbUser] = useState<CurrentUserResponse | null>(null);
  const [journeyPhase, setJourneyPhase] = useState<"idle" | "playing" | "complete">("idle");
  const [journeyCycle, setJourneyCycle] = useState(0);
  const journeySectionRef = useRef<HTMLElement | null>(null);
  const journeyArmedRef = useRef(true);
  const lastScrollYRef = useRef(0);
  const journeyTimerRef = useRef<number | null>(null);

  const { scrollYProgress: pageProgress } = useScroll();
  const heroLift = useSpring(
    useTransform(pageProgress, [0, 0.22], [0, 150]),
    { stiffness: 90, damping: 24 }
  );
  const heroTurn = useSpring(
    useTransform(pageProgress, [0, 0.22], [0, 18]),
    { stiffness: 70, damping: 22 }
  );

  useEffect(() => {
    setIsAdmin(
      new URLSearchParams(window.location.search).get("admin") === "true"
    );
  }, []);

  useEffect(() => {
    if (shouldReduceMotion) return;
    const timer = window.setInterval(() => {
      setActiveSignal((current) => (current + 1) % signalNodes.length);
    }, 1800);
    return () => window.clearInterval(timer);
  }, [shouldReduceMotion]);

  useEffect(() => {
    const fetchUser = async () => {
      if (!isSignedIn) return;
      const email = user?.primaryEmailAddress?.emailAddress;
      if (!email) return;

      try {
        setDbUser(await getCurrentUser(email));
      } catch (err) {
        console.error("[Dashboard] error calling getCurrentUser:", err);
      }
    };

    fetchUser();
  }, [isSignedIn, user]);

  useEffect(() => {
    if (dbUser) setRole(dbUser.role);
  }, [dbUser]);

  useEffect(() => {
    const section = journeySectionRef.current;
    if (!section) return;

    if (shouldReduceMotion) {
      setJourneyPhase("complete");
      return;
    }

    let frame = 0;
    lastScrollYRef.current = window.scrollY;

    const clearJourneyTimer = () => {
      if (journeyTimerRef.current !== null) {
        window.clearTimeout(journeyTimerRef.current);
        journeyTimerRef.current = null;
      }
    };

    const updateJourney = () => {
      frame = 0;
      const currentScrollY = window.scrollY;
      const direction = currentScrollY - lastScrollYRef.current;
      const rect = section.getBoundingClientRect();

      // Leaving the section above re-arms it, but upward scrolling never replays it.
      if (direction < 0 && rect.top >= window.innerHeight * 0.88) {
        journeyArmedRef.current = true;
      }

      if (
        direction > 0 &&
        journeyArmedRef.current &&
        rect.top <= window.innerHeight * 0.72 &&
        rect.bottom > window.innerHeight * 0.25
      ) {
        journeyArmedRef.current = false;
        clearJourneyTimer();
        setJourneyCycle((cycle) => cycle + 1);
        setJourneyPhase("playing");
        journeyTimerRef.current = window.setTimeout(() => {
          setJourneyPhase("complete");
          journeyTimerRef.current = null;
        }, 15000);
      }

      // Once the section is passed, lock the resolved route instead of looping off-screen.
      if (rect.bottom <= 0) {
        clearJourneyTimer();
        setJourneyPhase("complete");
      }

      lastScrollYRef.current = currentScrollY;
    };

    const handleScroll = () => {
      if (!frame) frame = window.requestAnimationFrame(updateJourney);
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", handleScroll);
      if (frame) window.cancelAnimationFrame(frame);
      clearJourneyTimer();
    };
  }, [shouldReduceMotion]);

  const userId =
    dbUser?.user && "id" in dbUser.user && dbUser.user.id
      ? dbUser.user.id
      : user?.id;

  const handleClick = (path: string) => {
    if (path.includes("admin")) {
      router.push(path);
      return;
    }
    const isRegisterRoute = /^\/(donor|hospital|bloodbank)\/register/.test(path);
    router.push(isRegisterRoute || isSignedIn ? path : "/auth/sign-up");
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
    <div className={`${editorial.page} ${styles.page}`}>
      <Header variant="editorial" />
      {isAdmin && <PasskeyModal />}

      <main>
        <section className={styles.hero}>
          <div className={styles.heroGlow} aria-hidden="true" />
          <div className={editorial.frame}>
            <div className={`${editorial.metaBar} ${styles.metaBar}`}>
              <span>HAEMOLOGIX / EMERGENCY BLOOD NETWORK</span>
              <span>HOWRAH · INDIA</span>
              <span>THE REQUEST STARTS HERE</span>
            </div>

            <div className={styles.heroGrid}>
              <motion.div
                className={styles.heroCopy}
                initial={shouldReduceMotion ? false : "hidden"}
                animate="visible"
                variants={reveal}
                transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
              >
                <p className={editorial.eyebrow}>BETWEEN NEED AND RELIEF</p>
                <h1 className={styles.heroTitle}>
                  Emergency blood
                  <span>moves in minutes.</span>
                  Not phone calls.
                </h1>
                <p className={styles.heroLede}>
                  One request travels through Haemologix—matched by blood group,
                  distance and donation gap—until the right nearby donor says yes.
                </p>

                <div className={styles.heroActions}>
                  {signedInWithRole ? (
                    <button
                      type="button"
                      onClick={() => handleClick(dashboardPath)}
                      className={styles.primaryAction}
                    >
                      {dashboardMessage}
                      <ArrowRight aria-hidden="true" />
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => handleClick("/donor/onboard")}
                      className={styles.primaryAction}
                    >
                      Join as a donor
                      <Droplet aria-hidden="true" />
                    </button>
                  )}
                  <Link href="/pilot" className={styles.secondaryAction}>
                    Run a hospital pilot
                    <ArrowUpRight aria-hidden="true" />
                  </Link>
                </div>

                <div className={styles.heroTrust}>
                  <span><ShieldCheck aria-hidden="true" /> Verified network</span>
                  <span><Smartphone aria-hidden="true" /> No app required</span>
                  <span><Timer aria-hidden="true" /> Two-minute sign-up</span>
                </div>
              </motion.div>

              <motion.div
                className={styles.networkStage}
                style={shouldReduceMotion ? undefined : { y: heroLift, rotateZ: heroTurn }}
                role="img"
                aria-label="A blood request moving through the Haemologix network"
              >
                <div className={styles.networkHalo} aria-hidden="true" />
                <div className={`${styles.orbit} ${styles.orbitOne}`} aria-hidden="true" />
                <div className={`${styles.orbit} ${styles.orbitTwo}`} aria-hidden="true" />
                <div className={styles.networkCore}>
                  <span className={styles.corePulse} aria-hidden="true" />
                  <Image
                    src="/assets/Logos - transparent bg/icon 1.png"
                    alt=""
                    width={132}
                    height={158}
                    priority
                  />
                  <strong>LIVE</strong>
                </div>

                {signalNodes.map(({ label, time, Icon }, index) => (
                  <motion.div
                    key={label}
                    className={`${styles.signalNode} ${styles[`signalNode${index + 1}`]} ${
                      activeSignal === index ? styles.signalNodeActive : ""
                    }`}
                    animate={
                      shouldReduceMotion
                        ? undefined
                        : { y: activeSignal === index ? -7 : 0, scale: activeSignal === index ? 1.05 : 1 }
                    }
                    transition={{ type: "spring", stiffness: 220, damping: 18 }}
                  >
                    <span><Icon aria-hidden="true" /></span>
                    <div>
                      <strong>{label}</strong>
                      <small>{time}</small>
                    </div>
                  </motion.div>
                ))}

                <div className={styles.liveStatus}>
                  <span />
                  {signalNodes[activeSignal].label} in progress
                </div>
                <div className={styles.stageShadow} aria-hidden="true" />
              </motion.div>
            </div>

            <a href="#journey" className={styles.scrollCue}>
              Follow one request
              <ArrowDown aria-hidden="true" />
            </a>
          </div>
        </section>

        <section className={styles.statsStream} aria-label="Haemologix network statistics">
          <div className={editorial.frame}>
            <header className={styles.statsHeading}>
              <div>
                <p>THE SIGNAL KEEPS TRAVELLING</p>
                <h2>Proof measured in response.</h2>
              </div>
              <p>
                Every number is another point where a request found reach, trust and a real
                person ready to move.
              </p>
            </header>

            <div className={styles.statsTrack}>
              {stats.map((stat, index) => {
                const StatIcon = stat.icon;
                return (
                  <motion.article
                    className={styles.stat}
                    key={stat.label}
                    initial={shouldReduceMotion ? false : { opacity: 0, y: 34 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true, amount: 0.45 }}
                    transition={{ delay: index * 0.09, duration: 0.6 }}
                  >
                    <span className={styles.statIndex}>0{index + 1}</span>
                    <div className={styles.statNode}><StatIcon aria-hidden="true" /></div>
                    <div className={styles.statCopy}>
                      <strong>{stat.value}</strong>
                      <span>{stat.label}</span>
                      <small>{statNotes[stat.label]}</small>
                    </div>
                  </motion.article>
                );
              })}
            </div>
          </div>
        </section>

        <section id="journey" ref={journeySectionRef} className={styles.journey}>
          <div className={editorial.frame}>
            <div className={styles.journeyIntro}>
              <p className={editorial.darkEyebrow}>ONE REQUEST / FIVE MOVES</p>
              <h2>A blood drop with somewhere urgent to be.</h2>
              <p>
                It does not move in a straight line. It finds the right people, changes
                direction, gathers confirmation and keeps going until the emergency is answered.
              </p>
            </div>

            <div
              key={journeyCycle}
              className={`${styles.journeyMap} ${
                journeyPhase === "playing"
                  ? styles.journeyMapPlaying
                  : journeyPhase === "complete"
                    ? styles.journeyMapComplete
                    : ""
              }`}
            >
              <div className={styles.routeGrid} aria-hidden="true" />
              <svg
                className={styles.routePath}
                viewBox="0 0 100 100"
                preserveAspectRatio="none"
                aria-hidden="true"
              >
                <path className={styles.routeEntry} d="M 6 2 C 6 5, 6 7, 6 10" />
                <path className={styles.routeLegOne} d="M 6 10 C 6 20, 65 17, 65 27" />
                <path className={styles.routeLegTwo} d="M 65 27 C 65 37, 15 34, 15 44" />
                <path className={styles.routeLegThree} d="M 15 44 C 15 54, 63 51, 63 61" />
                <path className={styles.routeLegFour} d="M 63 61 C 63 71, 8 68, 8 78" />
                <path className={styles.routeExit} d="M 8 78 C 8 89, 50 86, 50 95" />
              </svg>
              <div className={styles.journeyRunner} aria-hidden="true">
                <Image src="/blood-drop-exact.png" alt="" width={500} height={817} />
              </div>

              <ol className={styles.journeySteps}>
                {steps.map((item, index) => {
                  const Icon = journeyIcons[index] ?? Activity;
                  return (
                    <li
                      className={`${styles.journeyStep} ${styles[`journeyStep${index + 1}`]}`}
                      key={item.step}
                    >
                      <div className={styles.stepNode}>
                        <span>0{item.step}</span>
                        <Icon aria-hidden="true" />
                      </div>
                      <div className={styles.stepCopy}>
                        <span>{item.step === "1" ? "THE NEED" : item.step === "5" ? "EMERGENCY ANSWERED" : "THE NETWORK"}</span>
                        <h3>{item.title}</h3>
                        <p>{item.description}</p>
                      </div>
                    </li>
                  );
                })}
              </ol>

              <div className={styles.journeyStart}>
                <CircleAlert aria-hidden="true" />
                <span>EMERGENCY</span>
                <strong>REQUEST RAISED / T+0:00</strong>
              </div>
              <div className={styles.journeyFinish}>
                <CheckCircle2 aria-hidden="true" />
                <span>REQUEST ANSWERED</span>
                <strong>DONOR CONFIRMED / T+12:00</strong>
              </div>
            </div>
          </div>
        </section>

        <section className={styles.capabilities}>
          <div className={styles.capabilityGlow} aria-hidden="true" />
          <div className={editorial.frame}>
            <div className={styles.capabilityHeading}>
              <p className={editorial.darkEyebrow}>THE ENGINE UNDER THE FLOW</p>
              <h2>Four quiet systems.<br />One fast answer.</h2>
            </div>

            <div className={styles.capabilityFlow}>
              <div className={styles.flowLine} aria-hidden="true" />
              {features.map((feature, index) => {
                const Icon = feature.icon;
                return (
                  <motion.article
                    className={styles.capability}
                    key={feature.title}
                    initial={shouldReduceMotion ? false : { opacity: 0, y: 38 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true, amount: 0.45 }}
                    transition={{ delay: index * 0.1, duration: 0.65, ease: [0.22, 1, 0.36, 1] }}
                  >
                    <div className={styles.capabilityIcon}><Icon aria-hidden="true" /></div>
                    <span>{featureMeta[index]?.code ?? "CORE"} / 0{index + 1}</span>
                    <h3>{feature.title}</h3>
                    <p>{feature.description}</p>
                    <small>{featureMeta[index]?.detail}</small>
                  </motion.article>
                );
              })}
            </div>
          </div>
        </section>

        <section className={styles.community}>
          <div className={editorial.frame}>
            <div className={styles.communityHeading}>
              <div>
                <p className={editorial.eyebrow}>THE PEOPLE INSIDE THE SYSTEM</p>
                <h2>Not users.<br />A living network.</h2>
              </div>
              <p>
                Hospitals raise the signal. Blood banks add reach. Donors turn a digital
                match into a real arrival.
              </p>
            </div>
          </div>

          <div className={styles.sheet}>
            <div className={`${styles.sheetFade} ${styles.sheetFadeLeft}`} aria-hidden="true" />
            <div className={`${styles.sheetFade} ${styles.sheetFadeRight}`} aria-hidden="true" />

            <div className={`${styles.sheetRow} ${styles.scrollLeft}`}>
              {[...firstRowData, ...firstRowData, ...firstRowData].map((item, index) => (
                <figure className={styles.tile} key={`community-row-1-${index}`}>
                  <Image
                    src={item.image || "/placeholder.jpg"}
                    alt={index >= firstRowData.length ? "" : item.title}
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
                <figure className={styles.tile} key={`community-row-2-${index}`}>
                  <Image
                    src={item.image || "/placeholder.jpg"}
                    alt={index >= secondRowData.length ? "" : item.title}
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

        <section className={styles.closing}>
          <div className={styles.closingOrbit} aria-hidden="true" />
          <div className={styles.closingDrop} aria-hidden="true"><Droplet /></div>
          <motion.div
            className={styles.closingContent}
            initial={shouldReduceMotion ? false : { opacity: 0, scale: 0.94 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true, amount: 0.45 }}
            transition={{ duration: 0.7 }}
          >
            <span>THE LAST MOVE IS YOURS</span>
            <h2>Be the reason<br />it only took minutes.</h2>
            <p>
              Register once. Get alerted only when your blood group is needed near you.
            </p>
            {signedInWithRole ? (
              <button
                type="button"
                onClick={() => handleClick(dashboardPath)}
                className={styles.closingAction}
              >
                {dashboardMessage}
                <ArrowRight aria-hidden="true" />
              </button>
            ) : (
              <Link href="/donor/onboard" className={styles.closingAction}>
                Register as a donor
                <Users aria-hidden="true" />
              </Link>
            )}
            {!signedInWithRole && (
              <div className={styles.organisationLinks}>
                <button type="button" onClick={() => handleClick("/hospital/register")}>
                  Hospital registration <ArrowUpRight />
                </button>
                <button type="button" onClick={() => handleClick("/bloodbank/register")}>
                  Blood bank registration <ArrowUpRight />
                </button>
              </div>
            )}
          </motion.div>
        </section>
      </main>

      <EditorialFooter />
    </div>
  );
};

export default HomePage;
