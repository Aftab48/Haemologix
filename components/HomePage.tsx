"use client";

import { useEffect, useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Heart, Shield, Activity, Droplet, Droplets } from "lucide-react";
import Link from "next/link";
import {
  SignedIn,
  SignedOut,
  SignInButton,
  SignUpButton,
  UserButton,
  useUser,
} from "@clerk/nextjs";
import { useRouter, useSearchParams } from "next/navigation";
import PasskeyModal from "@/components/PasskeyModal";
import { stats, features, steps, CarouselData } from "@/constants";
import { getCurrentUser } from "@/lib/actions/user.actions";
import Image from "next/image";
import { gsap, slideInUp, fadeIn, staggerIn, scrollReveal } from "@/lib/gsap-utils";
import Header from "@/components/Header";

const HomePage = () => {
  const [activeFeature, setActiveFeature] = useState(0);
  const heroRef = useRef<HTMLElement | null>(null);
  const statsRef = useRef<HTMLDivElement | null>(null);
  const featuresRef = useRef<HTMLElement | null>(null);
  const stepsRef = useRef<HTMLElement | null>(null);

  const searchParams = useSearchParams();
  const isAdmin = searchParams.get("admin") === "true";

  const router = useRouter();

  const handleClick = (path: string) => {
    // Allow direct access to admin without authentication
    if (path.includes("admin")) {
      router.push(path);
      return;
    }
    
    if (!isSignedIn) {
      router.push("/auth/sign-up");
    } else {
      router.push(path);
    }
  };

  const { user, isSignedIn } = useUser();
  const [role, setRole] = useState<UserRole>(null);
  const [dbUser, setDbUser] = useState<any>(null);
  const userId = user?.id;

  useEffect(() => {
    const fetchUser = async () => {
      if (!isSignedIn) return;

      const email = user?.primaryEmailAddress?.emailAddress;
      if (!email) return;

      try {
        const res = await getCurrentUser(email);
        console.log("[Dashboard] server action response:", res); // <--- log raw response
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

  // GSAP animations on mount
  useEffect(() => {
    // Create a GSAP context for proper cleanup
    const ctx = gsap.context(() => {
      if (heroRef.current) {
        gsap.from(heroRef.current, {
          opacity: 0,
          y: 50,
          duration: 1,
          ease: 'power3.out',
        });
      }

      if (statsRef.current) {
        const statCards = statsRef.current.querySelectorAll('.stat-card');
        // Set initial visible state first
        gsap.set(statCards, { opacity: 1, scale: 1 });
        
        // Then animate from the initial state
        gsap.from(statCards, {
          scale: 0.8,
          opacity: 0,
          duration: 0.6,
          stagger: 0.1,
          ease: 'back.out(1.7)',
          scrollTrigger: {
            trigger: statsRef.current,
            start: 'top 80%',
            once: true, // Only animate once
          },
        });
      }
    });

    // Cleanup function to kill all animations and ScrollTriggers
    return () => {
      ctx.revert(); // Reverts all animations in this context
    };
  }, []);

  let dashboardMessage = "";
  let dashboardPath = "/";
  if (role === "DONOR") {
    dashboardPath = `/donor/${userId}`;
    dashboardMessage = "Donor Dashboard";
  }
  if (role === "HOSPITAL") {
    dashboardPath = `/hospital/${userId}`;
    dashboardMessage = "Hospital Dashboard";
  }

  return (
    <div className="min-h-screen relative" style={{
      background: `
        radial-gradient(at 15% 20%, #9B2226 0px, transparent 50%),
        radial-gradient(at 85% 10%, #94D2BD 0px, transparent 45%),
        radial-gradient(at 60% 80%, #E9D8A6 0px, transparent 50%),
        radial-gradient(at 30% 60%, #9B2226 0px, transparent 40%),
        radial-gradient(at 75% 45%, #94D2BD 0px, transparent 35%),
        radial-gradient(at 10% 85%, #E9D8A6 0px, transparent 45%),
        radial-gradient(at 90% 75%, #9B2226 0px, transparent 38%),
        radial-gradient(at 45% 25%, #94D2BD 0px, transparent 42%),
        linear-gradient(135deg, #E9D8A6 0%, #94D2BD 50%, #9B2226 100%)
      `
    }}>
      {/* Noise Overlay */}
      <div 
        className="fixed inset-0 opacity-60 mix-blend-overlay pointer-events-none"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 400 400' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='1.1' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")`,
          backgroundRepeat: 'repeat',
          backgroundSize: '180px 180px'
        }}
      />
      {/* Structured Data (JSON-LD) for SEO */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@graph": [
              {
                "@type": "Organization",
                "@id": "https://haemologix.in/#organization",
                name: "HaemoLogix",
                alternateName: "haemologix",
                url: "https://haemologix.in",
                logo: "https://haemologix.in/logo.png",
                description:
                  "Real-time blood donation platform connecting hospitals with blood donors through emergency alerts and geolocation matching.",
                sameAs: [],
                contactPoint: {
                  "@type": "ContactPoint",
                  contactType: "Customer Service",
                  availableLanguage: ["English", "Hindi"],
                },
              },
              {
                "@type": "WebSite",
                "@id": "https://haemologix.in/#website",
                url: "https://haemologix.in",
                name: "HaemoLogix",
                description:
                  "Emergency blood shortage alert and donor mobilization system connecting hospitals with eligible donors.",
                publisher: {
                  "@id": "https://haemologix.in/#organization",
                },
                potentialAction: {
                  "@type": "SearchAction",
                  target: {
                    "@type": "EntryPoint",
                    urlTemplate: "https://haemologix.in/search?q={search_term_string}",
                  },
                  "query-input": "required name=search_term_string",
                },
              },
              {
                "@type": "Service",
                "@id": "https://haemologix.in/#service",
                name: "Blood Donation Platform",
                description:
                  "Real-time blood donation platform for emergency blood requests, donor registration, and blood bank management.",
                provider: {
                  "@id": "https://haemologix.in/#organization",
                },
                areaServed: {
                  "@type": "Country",
                  name: "India",
                },
                serviceType: "Blood Donation Platform",
                category: "Healthcare",
              },
            ],
          }),
        }}
      />
      {/* Header */}
      <Header />

      {isAdmin && <PasskeyModal />}

      {/* Hero Section */}
      <section ref={heroRef} className="py-20 px-4 bg-transparent relative overflow-hidden z-10">
        <div className="absolute inset-0 bg-white/5 backdrop-blur-[2px]"></div>
        <div className="absolute inset-0 oxygen-flow opacity-10"></div>
        <div className="container mx-auto text-center relative z-10">
          <Badge className="mb-4 animate-pulse-red bg-primary/20 text-primary border-primary hover:bg-primary/30 transition-colors">
            🚨 Emergency Blood Donation Platform
          </Badge>
          <h1 className="text-5xl md:text-6xl font-outfit font-bold mb-6 leading-tight text-primary animate-fade-in">
            Save Lives with
            <span className="block text-secondary mt-2">Real-Time Blood Alerts</span>
          </h1>
          <p className="text-xl mb-8 max-w-3xl mx-auto leading-relaxed text-text-dark font-dm-sans animate-slide-in-up">
            Connect hospitals in critical need with eligible donors instantly.
            Our platform uses geolocation matching and real-time notifications
            to mobilize donors when every second counts.
          </p>

          <div className="mb-12">
            {/* 👇 Show if NOT signed in */}
            {(!isSignedIn || !role) && (
              <div className="flex flex-wrap justify-center gap-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 justify-center">
                  <Button
                    size="lg"
                    onClick={() => handleClick("/donor/register")}
                    className="gradient-ruby hover:opacity-90 text-lg px-8 py-3 w-64 text-white shadow-lg hover:shadow-primary/50 transition-all duration-300"
                  >
                    <Heart className="w-5 h-5 mr-2" />
                    Become a Donor
                  </Button>

                  <Button
                    size="lg"
                    onClick={() => handleClick("/hospital/register")}
                    className="bg-transparent hover:bg-secondary/10 text-lg px-8 py-3 w-64 text-secondary border-secondary border-2 transition-all duration-300"
                  >
                    <Activity className="w-5 h-5 mr-2" />
                    Hospital Registration
                  </Button>

                  <Button
                    size="lg"
                    onClick={() => handleClick("/bloodbank/register")}
                    className="bg-transparent hover:bg-accent/20 text-lg px-8 py-3 w-64 text-text-dark border-accent border-2 transition-all duration-300"
                  >
                    <Droplets className="w-8 h-8 mr-2" />
                    Blood Bank Registration
                  </Button>

                  <Button
                    size="lg"
                    onClick={() => handleClick("/?admin=true")}
                    className="gradient-oxygen hover:opacity-90 text-lg px-8 py-3 w-64 text-white shadow-lg hover:shadow-secondary/50 transition-all duration-300"
                  >
                    <Shield className="w-5 h-5 mr-2" />
                    Admin Dashboard
                  </Button>
                </div>
              </div>
            )}

            {/* 👇 Show if signed in */}
            {isSignedIn && role && (
              <div className=" gap-4 flex flex-col md:flex-row justify-center">
                <Button
                  size="lg"
                  onClick={() => handleClick(dashboardPath)}
                  className="gradient-ruby hover:opacity-90 text-lg px-8 py-3 text-white shadow-lg hover:shadow-primary/50 transition-all duration-300"
                >
                  <Activity className="w-5 h-5 mr-2" />
                  {dashboardMessage}
                </Button>
                <Button
                  size="lg"
                  onClick={() => handleClick("/?admin=true")}
                  className="gradient-oxygen hover:opacity-90 text-lg px-8 py-3 text-white shadow-lg hover:shadow-secondary/50 transition-all duration-300"
                >
                  <Shield className="w-5 h-5 mr-2" />
                  Admin Dashboard
                </Button>
              </div>
            )}
          </div>

          {/* Stats */}
          <div ref={statsRef} className="grid grid-cols-2 md:grid-cols-4 gap-6 max-w-4xl mx-auto relative z-20">
            {stats.map((stat, index) => (
              <Card
                key={index}
                className="stat-card border-2 border-accent/40 shadow-xl glass-morphism card-hover bg-white/30 backdrop-blur-md hover:bg-white/40 hover:shadow-primary/50"
              >
                <CardContent className="p-6 text-center">
                  <stat.icon className="w-8 h-8 mx-auto mb-2 text-primary drop-shadow-lg" />
                  <div className="text-2xl font-outfit font-bold text-secondary drop-shadow-md">
                    {stat.value}
                  </div>
                  <div className="text-sm font-dm-sans text-text-dark font-semibold">{stat.label}</div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section
        id="features"
        ref={featuresRef}
        className="py-20 px-4 bg-white/5 backdrop-blur-[2px] relative z-10"
      >
        <div className="container mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-outfit font-bold mb-4 text-primary border-0">
              Powerful Features
            </h2>
            <p className="text-xl max-w-2xl mx-auto text-text-dark font-dm-sans">
              Advanced technology meets humanitarian mission to create the most
              efficient blood donation network.
            </p>
          </div>

          <div className="w-full px-2 md:px-0">
            <div className="grid grid-cols-2 gap-6 max-w-4xl mx-auto mb-8">
              {features.map((feature, index) => (
                <Card
                  key={index}
                  className={`cursor-pointer transition-all duration-300 h-full glass-morphism border shadow-lg hover:shadow-accent/50 hover:shadow-2xl hover:border-accent/60 card-hover ${
                    activeFeature === index
                      ? "border-primary shadow-lg bg-white/40 scale-105"
                      : "border-mist-green/40"
                  }`}
                  onClick={() => setActiveFeature(index)}
                >
                  <CardContent className="p-4 h-full flex flex-col">
                    <div className="flex items-start gap-3 flex-1">
                      <div className="w-6 h-6 md:w-10 md:h-10 rounded-lg flex items-center justify-center flex-shrink-0 gradient-oxygen text-white">
                        <feature.icon className="w-5 h-5" />
                      </div>
                      <div className="flex-1">
                        <h3 className="text-base font-outfit font-semibold mb-1 text-primary">
                          {feature.title}
                        </h3>
                        <p className="text-xs leading-tight font-dm-sans text-text-dark/80">
                          {feature.description}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section
        id="how-it-works"
        ref={stepsRef}
        className="py-20 px-4 bg-transparent relative overflow-hidden z-10"
      >
        <div className="container mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-outfit font-bold mb-4 text-primary">
              How It Works
            </h2>
            <p className="text-xl font-dm-sans text-text-dark">
              Simple steps to save lives in critical moments.
            </p>
          </div>

          <div className="relative max-w-6xl mx-auto">
            {/* Animated connector lines */}
            <svg
              className="absolute hidden md:block inset-0 w-full h-full pointer-events-none"
              style={{ zIndex: 1 }}
            >
              <defs>
                <linearGradient
                  id="lineGradient"
                  x1="0%"
                  y1="0%"
                  x2="100%"
                  y2="0%"
                >
                  <stop offset="0%" stopColor="#94D2BD" stopOpacity="0.8" />
                  <stop offset="100%" stopColor="#005F73" stopOpacity="0.6" />
                </linearGradient>
              </defs>
              {/* Step 1 to 2 */}
              <path
                d="M 200 120 Q 300 80 400 120"
                stroke="url(#lineGradient)"
                strokeWidth="3"
                fill="none"
                className="animate-pulse"
                strokeDasharray="10,5"
              />
              {/* Step 2 to 3 */}
              <path
                d="M 400 120 Q 500 160 600 120"
                stroke="url(#lineGradient)"
                strokeWidth="3"
                fill="none"
                className="animate-pulse"
                strokeDasharray="10,5"
                style={{ animationDelay: "0.5s" }}
              />
              {/* Step 3 to 4 */}
              <path
                d="M 600 120 Q 700 80 800 120"
                stroke="url(#lineGradient)"
                strokeWidth="3"
                fill="none"
                className="animate-pulse"
                strokeDasharray="10,5"
                style={{ animationDelay: "1s" }}
              />
              {/* Step 4 to 5 */}
              <path
                d="M 800 120 Q 900 160 1000 120"
                stroke="url(#lineGradient)"
                strokeWidth="3"
                fill="none"
                className="animate-pulse"
                strokeDasharray="10,5"
                style={{ animationDelay: "1.5s" }}
              />
            </svg>

            <div
              className="grid grid-cols-1 md:grid-cols-5 gap-8 relative"
              style={{ zIndex: 2 }}
            >
              {steps.map((item, index) => (
                <div
                  key={index}
                  className="flex flex-col items-center text-center group"
                  style={{
                    animation: `fadeInUp 0.8s ease-out ${item.delay} both`,
                  }}
                >
                  <div className="relative mb-6">
                    <div className="w-24 h-24 rounded-full glass-morphism border-2 border-accent shadow-lg flex items-center justify-center text-3xl transition-all duration-300 group-hover:shadow-primary/50 group-hover:shadow-2xl group-hover:bg-mist-green/40 group-hover:scale-110 animate-float">
                      <span className="filter drop-shadow-lg">{item.icon}</span>
                    </div>
                    <div className="absolute -bottom-2 left-1/2 transform -translate-x-1/2 w-8 h-8 rounded-full gradient-oxygen backdrop-blur-sm flex items-center justify-center text-white font-outfit font-bold text-sm border-2 border-secondary">
                      {item.step}
                    </div>
                  </div>
                  <h3 className="text-lg font-outfit font-semibold text-primary mb-3 group-hover:text-secondary transition-colors duration-300">
                    {item.title}
                  </h3>
                  <p className="text-sm font-dm-sans text-text-dark leading-relaxed group-hover:text-text-dark/80 transition-colors duration-300">
                    {item.description}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>

        <style jsx>{`
          @keyframes fadeInUp {
            from {
              opacity: 0;
              transform: translateY(30px);
            }
            to {
              opacity: 1;
              transform: translateY(0);
            }
          }
        `}</style>
      </section>

      {/* Partners & Community Section */}
      <section className="py-30 px-4 bg-white/5 backdrop-blur-[2px] relative overflow-hidden z-10">
        <div className="container mx-auto">
          <div className="text-center mb-20">
            <h2 className="text-4xl font-outfit font-bold mb-4 text-primary mt-11">
              Our Community Impact
            </h2>
            <p className="text-xl font-dm-sans text-text-dark">
              Trusted by hospitals, loved by donors, saving lives together.
            </p>
          </div>

          <div className="bgrelative w-full h-96 flex items-center justify-center mb-20">
            <div
              className="flipster-carousel relative w-full max-w-5xl h-full flex items-center justify-center perspective-1200 mx-auto"
              style={{ width: "70%" }}
            >
              {CarouselData.map((item, index) => {
                const totalCards = 7;
                const centerIndex = Math.floor(totalCards / 2);
                const offset = index - centerIndex;
                const isCenter = index === centerIndex;

                return (
                  <div
                    key={index}
                    className="flipster-item absolute w-64 h-72 transition-all duration-1000 ease-in-out"
                    style={{
                      transform: `translateX(${offset * 300}px) rotateY(${
                        offset * 35
                      }deg) translateZ(${
                        isCenter ? "80px" : Math.abs(offset) * -60 + "px"
                      })`,
                      zIndex: isCenter ? 10 : 10 - Math.abs(offset),
                      opacity: Math.abs(offset) > 2 ? 0 : 1,
                      animation: `flipster-flow 28s linear infinite`,
                      animationDelay: `${index * -4}s`,
                    }}
                  >
                    <div
                      className={`w-full h-full border-2 rounded-2xl shadow-2xl transition-all duration-500 overflow-hidden group glass-morphism ${
                        isCenter
                          ? "shadow-primary/60 border-primary scale-110 animate-glow"
                          : "border-mist-green hover:shadow-accent/40 hover:border-accent"
                      }`}
                    >
                      <div className="relative h-44 overflow-hidden rounded-t-2xl">
                        <img
                          src={item.image || "/placeholder.svg"}
                          alt={item.title}
                          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-primary/30 to-transparent"></div>
                      </div>
                      <div className="p-4 text-center bg-white/80 backdrop-blur-sm">
                        <h3
                          className={`text-base font-outfit font-semibold mb-2 transition-colors duration-300 ${
                            isCenter
                              ? "text-primary"
                              : "text-text-dark group-hover:text-secondary"
                          }`}
                        >
                          {item.title}
                        </h3>
                        <div className="flex justify-center">
                          <span
                            className={`px-2 py-1 rounded-full text-xs font-dm-sans font-medium ${
                              item.type === "hospital"
                                ? "bg-secondary/20 text-secondary"
                                : item.type === "donors"
                                ? "bg-accent/30 text-text-dark"
                                : item.type === "event"
                                ? "bg-primary/20 text-primary"
                                : "bg-mist-green/40 text-text-dark"
                            }`}
                          >
                            {item.type.charAt(0).toUpperCase() +
                              item.type.slice(1)}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Stats overlay */}
        </div>

        <style jsx>{`
          .perspective-1200 {
            perspective: 1200px;
          }

          @keyframes flipster-flow {
            0% {
              transform: translateX(-900px) rotateY(-105deg) translateZ(-240px);
              opacity: 0;
            }
            10% {
              transform: translateX(-600px) rotateY(-70deg) translateZ(-180px);
              opacity: 0.7;
            }
            20% {
              transform: translateX(-300px) rotateY(-35deg) translateZ(-60px);
              opacity: 1;
            }
            30% {
              transform: translateX(0px) rotateY(0deg) translateZ(80px);
              opacity: 1;
            }
            45% {
              transform: translateX(0px) rotateY(0deg) translateZ(80px);
              opacity: 1;
            }
            55% {
              transform: translateX(300px) rotateY(35deg) translateZ(-60px);
              opacity: 1;
            }
            70% {
              transform: translateX(600px) rotateY(70deg) translateZ(-180px);
              opacity: 0.7;
            }
            85% {
              transform: translateX(900px) rotateY(105deg) translateZ(-240px);
              opacity: 0;
            }
            100% {
              transform: translateX(1200px) rotateY(140deg) translateZ(-300px);
              opacity: 0;
            }
          }

          .flipster-item:nth-child(1) {
            animation-delay: 0s;
          }
          .flipster-item:nth-child(2) {
            animation-delay: -4s;
          }
          .flipster-item:nth-child(3) {
            animation-delay: -8s;
          }
          .flipster-item:nth-child(4) {
            animation-delay: -12s;
          }
          .flipster-item:nth-child(5) {
            animation-delay: -16s;
          }
          .flipster-item:nth-child(6) {
            animation-delay: -20s;
          }
          .flipster-item:nth-child(7) {
            animation-delay: -24s;
          }
        `}</style>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-4 bg-white/5 backdrop-blur-[2px] relative overflow-hidden z-10">
        <div className="absolute inset-0 oxygen-flow opacity-10"></div>
        <div className="container mx-auto text-center relative z-10">
          <h2 className="text-4xl font-outfit font-bold mb-4 text-primary animate-scale-in">
            Ready to Save Lives?
          </h2>
          <p className="text-xl mb-8 max-w-2xl mx-auto font-dm-sans text-text-dark">
            Join thousands of donors and healthcare providers making a
            difference every day.
          </p>

          <>
            {(!isSignedIn || !role) && (
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Link href="/donor/register">
                  <Button
                    size="lg"
                    variant="secondary"
                    className="text-lg px-8 py-3 gradient-ruby text-white hover:opacity-90 shadow-lg hover:shadow-primary/50 transition-all duration-300"
                  >
                    Register as Donor
                  </Button>
                </Link>
                <Link href="/hospital/register">
                  <Button
                    size="lg"
                    variant="outline"
                    className="text-lg px-8 py-3 hover:bg-secondary/10 bg-transparent border-secondary border-2 text-secondary transition-all duration-300"
                  >
                    Register Hospital
                  </Button>
                </Link>
              </div>
            )}

            {isSignedIn && role && dbUser?.status === "APPROVED" && (
              <div className="flex justify-center">
                <Button
                  size="lg"
                  onClick={() => handleClick(dashboardPath)}
                  className="gradient-oxygen text-lg px-8 py-3 text-white shadow-lg hover:shadow-secondary/50 hover:opacity-90 transition-all duration-300"
                >
                  {dashboardMessage}
                </Button>
              </div>
            )}
          </>
        </div>
      </section>

      {/* Footer */}
      <footer
        className="text-text-dark py-12 my-0 px-4 mx-0 bg-text-dark/95 backdrop-blur-md relative z-10"
      >
        <div className="container mx-auto">
          <div className="grid md:grid-cols-4 gap-8">
            <div>
              <div className="flex items-center gap-2 mb-4">
                <Heart className="w-6 h-6 text-primary" />
                <span className="text-xl font-outfit font-bold text-background">
                  Haemologix
                </span>
              </div>
              <p className="text-background/80 font-dm-sans">
                Connecting lives through technology and compassion.
              </p>
            </div>
            <div>
              <h4 className="font-outfit font-semibold mb-4 text-background">Platform</h4>
              <ul className="space-y-2 text-background/80 font-dm-sans">
                <li>
                  <Link href="/donor" className="hover:text-accent transition-colors">
                    Donor Dashboard
                  </Link>
                </li>
                <li>
                  <Link href="/hospital" className="hover:text-accent transition-colors">
                    Hospital Portal
                  </Link>
                </li>
                <li>
                  <Link href="/admin" className="hover:text-accent transition-colors">
                    Admin Panel
                  </Link>
                </li>
              </ul>
            </div>
            <div>
              <h4 className="font-outfit font-semibold mb-4 text-background">Support</h4>
              <ul className="space-y-2 text-background/80 font-dm-sans">
                <li>
                  <Link href="#" className="hover:text-accent transition-colors">
                    Help Center
                  </Link>
                </li>
                <li>
                  <Link href="#" className="hover:text-accent transition-colors">
                    Contact Us
                  </Link>
                </li>
                <li>
                  <Link href="#" className="hover:text-accent transition-colors">
                    Emergency
                  </Link>
                </li>
              </ul>
            </div>
            <div>
              <h4 className="font-outfit font-semibold mb-4 text-background">Legal</h4>
              <ul className="space-y-2 text-background/80 font-dm-sans">
                <li>
                  <Link href="/privacy-policy" className="hover:text-accent transition-colors">
                    Privacy Policy
                  </Link>
                </li>
                <li>
                  <Link href="/terms-and-conditions" className="hover:text-accent transition-colors">
                    Terms of Service
                  </Link>
                </li>
                <li>
                  <Link href="#" className="hover:text-accent transition-colors">
                    HIPAA Compliance
                  </Link>
                </li>
              </ul>
            </div>
          </div>
          <div className="border-t border-background/30 mt-8 pt-8 text-center text-background/70 font-dm-sans">
            <p>
              &copy; 2024 Haemologix. All rights reserved. Built for saving
              lives.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default HomePage;
