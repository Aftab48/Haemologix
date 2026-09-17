"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Heart,
  TrendingUp,
  Globe,
  Users,
  Clock,
  Shield,
  Brain,
  ArrowRight,
  CheckCircle,
  Award,
  BarChart3,
  Rocket,
  Building,
  Network,
  AlertTriangle,
} from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import GradientBackground from "@/components/GradientBackground";
import Header from "@/components/Header";
import ScrollReveal from "@/components/ScrollReveal";

export default function ImpactAndProspects() {
  const [activeTab, setActiveTab] = useState("current-impact");

  const TAB_ITEMS = [
    { value: "current-impact", label: "Current Impact" },
    { value: "social-transformation", label: "Social Impact" },
    { value: "technology-roadmap", label: "Technology Roadmap" },
    { value: "partnerships", label: "Partnerships" },
    { value: "challenges", label: "Challenges & Solutions" },
  ];

  // Pilot figures only. Every number on this page must trace to real data —
  // add outcome metrics (donations, response times) once real alerts back them.
  const pilotFigures = [
    { value: "200+", label: "Donor profiles created", icon: Users },
    { value: "500+", label: "Documents uploaded", icon: BarChart3 },
    { value: "~70%", label: "Documents verified automatically", icon: CheckCircle },
  ];

  const futureGoals = [
    {
      category: "Scale",
      title: "National Coverage",
      description:
        "Expand to all major cities and rural areas across the country",
      target: "500+ hospitals, 100+ cities",
      timeline: "2025-2026",
      icon: Globe,
    },
    {
      category: "Technology",
      title: "AI-Powered Matching",
      description: "Advanced ML algorithms for optimal donor-hospital matching",
      target: "95% match accuracy",
      timeline: "2024-2025",
      icon: Brain,
    },
    {
      category: "Integration",
      title: "Healthcare System Integration",
      description: "Direct integration with hospital management systems",
      target: "80% of partner hospitals",
      timeline: "2025",
      icon: Network,
    },
    {
      category: "Innovation",
      title: "Predictive Analytics",
      description: "Forecast blood demand and prevent shortages proactively",
      target: "70% shortage prevention",
      timeline: "2026",
      icon: TrendingUp,
    },
  ];

  const socialImpact = [
    {
      metric: "Finding donors",
      before: "Phone lists and forwarded messages",
      after: "Nearby compatible donors alerted at once",
      improvement: "Automatic",
      icon: Users,
    },
    {
      metric: "Checking eligibility",
      before: "Asked over the phone",
      after: "Donation gap checked before anyone is alerted",
      improvement: "Before the alert",
      icon: Shield,
    },
    {
      metric: "When nobody responds",
      before: "Start calling again",
      after: "Search widens, blood banks are checked, then staff step in",
      improvement: "Escalates itself",
      icon: Clock,
    },
    {
      metric: "Donor verification",
      before: "Documents checked by hand",
      after: "Uploaded documents read automatically",
      improvement: "~70% automated",
      icon: CheckCircle,
    },
  ];

  const technologyRoadmap = [
    {
      phase: "Phase 1: Foundation",
      period: "2024 Q1-Q2",
      status: "completed",
      features: [
        "Real-time alert system",
        "Geolocation matching",
        "Multi-role dashboards",
        "Basic analytics",
      ],
    },
    {
      phase: "Phase 2: Intelligence",
      period: "2024 Q3-Q4",
      status: "in-progress",
      features: [
        "AI-powered donor matching",
        "Predictive blood demand",
        "Advanced analytics",
        "Mobile app launch",
      ],
    },
    {
      phase: "Phase 3: Integration",
      period: "2025 Q1-Q2",
      status: "planned",
      features: [
        "Hospital system integration",
        "Wearable device support",
        "Blockchain verification",
        "International expansion",
      ],
    },
    {
      phase: "Phase 4: Innovation",
      period: "2025 Q3-2026",
      status: "planned",
      features: [
        "IoT blood monitoring",
        "Drone delivery coordination",
        "AR/VR training modules",
        "Global network platform",
      ],
    },
  ];

  const partnerships = [
    {
      type: "Research",
      partners: ["FBDOI", "West Bengal Voluntary Blood Donors' Forum"],
      impact: "Research on why donors stop donating and how to bring them back",
      icon: Award,
    },
    {
      type: "Pilot",
      partners: ["Hospitals", "Blood banks"],
      impact: "We are onboarding pilot hospitals and blood banks. Get in touch to join.",
      icon: Heart,
    },
  ];

  const challenges = [
    {
      challenge: "Privacy & Data Security",
      description:
        "Protecting sensitive health information while enabling real-time sharing",
      solution:
        "Role-based access, consent-based data sharing, DPDP Act compliance",
      priority: "Critical",
    },
    {
      challenge: "Rural Area Coverage",
      description:
        "Limited internet connectivity and smartphone adoption in remote areas",
      solution:
        "Offline-capable apps, SMS fallbacks, community health worker integration",
      priority: "High",
    },
    {
      challenge: "Donor Fatigue",
      description: "Preventing over-alerting and maintaining donor engagement",
      solution:
        "Smart frequency controls, gamification, personalized communication",
      priority: "Medium",
    },
    {
      challenge: "Regulatory Compliance",
      description:
        "Meeting varying healthcare regulations across different regions",
      solution:
        "Modular compliance framework, local partnerships, legal expertise",
      priority: "High",
    },
  ];

  return (
    <GradientBackground className="flex flex-col">
      <Image
        src="https://fbe.unimelb.edu.au/__data/assets/image/0006/3322347/varieties/medium.jpg"
        alt=""
        width={1200}
        height={800}
        unoptimized
        className="w-full h-full object-cover absolute mix-blend-overlay opacity-20"
      />
      {/* Header */}
      <Header activePage="impact" />

      {/* Hero Section */}
      <section className="py-16 px-4">
        <div className="container mx-auto text-center">
          <ScrollReveal>
            <Badge className="mb-4 hover:bg-red-100 text-[rgba(127,29,29,1)] bg-[rgba(204,165,165,1)]">
              🌟 Transforming Emergency Healthcare
            </Badge>
            <h1 className="text-5xl md:text-6xl font-bold text-text-dark mb-6 leading-tight">
              Impact & Future
              <span className="text-primary block">Prospects</span>
            </h1>
            <p className="text-xl text-text-dark mb-8 max-w-3xl mx-auto leading-relaxed">
              Discover how Haemologix is changing emergency blood donation and our
              vision for the future of healthcare technology.
            </p>
          </ScrollReveal>
        </div>
      </section>

      <div className="container mx-auto px-4 pb-16">
        <Tabs
          value={activeTab}
          onValueChange={setActiveTab}
          className="space-y-4"
        >
          {/* Mobile: dropdown */}
          <div className="lg:hidden">
            <Select value={activeTab} onValueChange={setActiveTab}>
              <SelectTrigger
                className="
              w-full
              glass-morphism border border-white/20 rounded-lg
              text-white
            "
                aria-label="Select section"
              >
                <SelectValue placeholder="Select section" />
              </SelectTrigger>
              <SelectContent className="z-50">
                {TAB_ITEMS.map((t) => (
                  <SelectItem key={t.value} value={t.value}>
                    {t.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Desktop: normal tabs */}
          <TabsList
            className="
          hidden lg:grid lg:grid-cols-5 w-full
          glass-morphism border border-white/20 rounded-lg
        "
          >
            {TAB_ITEMS.map((t) => (
              <TabsTrigger
                key={t.value}
                value={t.value}
                className="
              w-full text-center text-white transition-all duration-300
              data-[state=active]:bg-yellow-600 data-[state=active]:text-white data-[state=active]:shadow-md
              first:rounded-l-md last:rounded-r-md
            "
              >
                {t.label}
              </TabsTrigger>
            ))}
          </TabsList>
          {/* Current Impact Tab */}
          <TabsContent value="current-impact" className="space-y-8">
            <ScrollReveal>
              <div className="text-center mt-10 mb-12">
                <h2 className="text-4xl font-bold text-text-dark mb-4">
                  Where the Pilot Stands
                </h2>
                <p className="text-xl text-text-dark max-w-2xl mx-auto">
                  What we can count today, from our own data
                </p>
              </div>
            </ScrollReveal>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
              {pilotFigures.map((figure, index) => (
                <ScrollReveal key={figure.label} delay={0.1 * (index + 1)}>
                  <Card className="glass-morphism border border-white/20 text-text-dark transition-all duration-300 hover:shadow-lg hover:shadow-primary/50/50 text-center">
                    <CardContent className="p-8">
                      <figure.icon className="w-12 h-12 text-primary mx-auto mb-4" />
                      <div className="text-4xl font-bold text-text-dark mb-2">
                        {figure.value}
                      </div>
                      <div className="text-text-dark">{figure.label}</div>
                    </CardContent>
                  </Card>
                </ScrollReveal>
              ))}
            </div>
            <p className="text-center text-sm text-text-dark/70 max-w-2xl mx-auto">
              Pilot figures, 2026. We will publish outcome numbers such as
              donations and response times once enough real emergency requests
              have gone through the platform to report them honestly.
            </p>
          </TabsContent>

          {/* Social Transformation Tab */}
          <TabsContent value="social-transformation" className="space-y-8">
            <ScrollReveal>
              <div className="text-center mt-10 mb-12">
                <h2 className="text-4xl font-bold text-text-dark mb-4">
                  Transforming Emergency Healthcare
                </h2>
                <p className="text-xl text-text-dark max-w-2xl mx-auto">
                  How Haemologix is revolutionizing the way we respond to medical
                  emergencies
                </p>
              </div>
            </ScrollReveal>

            <div className="grid gap-8 md:grid-cols-2">
              {socialImpact.map((impact, index) => (
                <ScrollReveal key={index} delay={index * 0.1}>
                  <Card
                    className="glass-morphism border border-white/20 text-text-dark transition-all duration-300 hover:shadow-lg hover:shadow-primary/50/50 flex flex-col"
                  >
                    <CardContent className="p-6 flex flex-col justify-between h-full">
                      {/* Header: Icon + Title */}
                      <div className="flex items-center gap-4 mb-6">
                        <div className="w-14 h-14 bg-red-100 rounded-xl flex items-center justify-center">
                          <impact.icon className="w-7 h-7 text-red-600" />
                        </div>
                        <h3 className="text-xl font-semibold text-text-dark">
                          {impact.metric}
                        </h3>
                      </div>

                      {/* Content Grid */}
                      <div className="grid grid-cols-3 items-center text-center gap-4">
                        {/* Before */}
                        <div>
                          <div className="text-sm text-text-dark/70 mb-1">
                            Before Haemologix
                          </div>
                          <div className="text-lg font-semibold text-red-800">
                            {impact.before}
                          </div>
                        </div>

                        {/* Improvement */}
                        <div className="flex flex-col items-center">
                          <ArrowRight className="w-6 h-6 text-text-dark/60 mb-2" />
                          <Badge className="bg-green-100 text-green-800 text-sm px-3 py-1">
                            {impact.improvement}
                          </Badge>
                        </div>

                        {/* After */}
                        <div>
                          <div className="text-sm text-text-dark/70 mb-1">
                            With Haemologix
                          </div>
                          <div className="text-lg font-semibold text-green-700">
                            {impact.after}
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </ScrollReveal>
              ))}
            </div>
          </TabsContent>

          {/* Technology Roadmap Tab */}
          <TabsContent value="technology-roadmap" className="space-y-8">
            <ScrollReveal>
              <div className="text-center mt-10 mb-12">
                <h2 className="text-4xl font-bold text-text-dark mb-4">
                  Technology Evolution
                </h2>
                <p className="text-xl text-text-dark max-w-2xl mx-auto">
                  Our roadmap for advancing blood donation technology and
                  expanding global impact
                </p>
              </div>
            </ScrollReveal>

            {/* Future Goals */}
            <div className="grid md:grid-cols-2 gap-6 mb-12">
              {futureGoals.map((goal, index) => (
                <ScrollReveal key={index} delay={index * 0.1}>
                  <Card
                    className="glass-morphism border border-white/20 text-text-dark transition-all duration-300 hover:shadow-lg hover:shadow-primary/50/50 flex flex-col"
                  >
                    <CardContent className="p-6">
                      <div className="flex items-start gap-4">
                        <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
                          <goal.icon className="w-6 h-6 text-blue-600" />
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <Badge variant="outline" className="text-text-dark">{goal.category}</Badge>
                            <Badge className="bg-gray-100 text-gray-800">
                              {goal.timeline}
                            </Badge>
                          </div>
                          <h3 className="text-lg font-semibold text-text-dark mb-2">
                            {goal.title}
                          </h3>
                          <p className="text-text-dark/80 mb-4">{goal.description}</p>
                          <p className="text-sm">Target: {goal.target}</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </ScrollReveal>
              ))}
            </div>

            {/* Technology Roadmap Timeline */}
            <ScrollReveal delay={0.4}>
              <Card className="glass-morphism border border-white/20 text-text-dark transition-all duration-300 hover:shadow-lg hover:shadow-primary/50/50 flex flex-col">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-text-dark">
                    <Rocket className="w-5 h-5" />
                    Development Timeline
                  </CardTitle>
                  <CardDescription className="text-text-dark/80">
                    Planned technology releases and feature rollouts
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-8">
                    {technologyRoadmap.map((phase, index) => (
                      <div key={index} className="flex gap-6">
                        <div className="flex flex-col items-center">
                          <div
                            className={`w-4 h-4 rounded-full ${
                              phase.status === "completed"
                                ? "bg-green-500"
                                : phase.status === "in-progress"
                                ? "bg-blue-500"
                                : "bg-gray-300"
                            }`}
                          />
                          {index < technologyRoadmap.length - 1 && (
                            <div className="w-0.5 h-16 bg-gray-200 mt-2" />
                          )}
                        </div>
                        <div className="flex-1 pb-8">
                          <div className="flex items-center gap-3 mb-2">
                            <h3 className="text-lg font-semibold text-text-dark">
                              {phase.phase}
                            </h3>
                            <Badge
                              className={
                                phase.status === "completed"
                                  ? "bg-green-100 text-green-800"
                                  : phase.status === "in-progress"
                                  ? "bg-blue-100 text-blue-800"
                                  : "bg-gray-100 text-gray-800"
                              }
                            >
                              {phase.status.replace("-", " ")}
                            </Badge>
                            <span className="text-sm text-text-dark/60">
                              {phase.period}
                            </span>
                          </div>
                          <div className="grid md:grid-cols-2 gap-2">
                            {phase.features.map((feature, featureIndex) => (
                              <div
                                key={featureIndex}
                                className="flex items-center gap-2"
                              >
                                <CheckCircle
                                  className={`w-4 h-4 ${
                                    phase.status === "completed"
                                      ? "text-green-500"
                                      : "text-gray-400"
                                  }`}
                                />
                                <span className="text-sm text-text-dark">{feature}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </ScrollReveal>
          </TabsContent>

          {/* Partnerships Tab */}
          <TabsContent value="partnerships" className="space-y-8">
            <ScrollReveal>
              <div className="text-center mt-10 mb-12">
                <h2 className="text-4xl font-bold text-text-dark mb-4">
                  Who We Work With
                </h2>
                <p className="text-xl text-text-dark max-w-2xl mx-auto">
                  Organisations helping us build and test Haemologix
                </p>
              </div>
            </ScrollReveal>

            <div className="grid md:grid-cols-2 gap-8">
              {partnerships.map((partnership, index) => (
                <ScrollReveal key={index} delay={index * 0.1}>
                  <Card
                    className="glass-morphism border border-white/20 text-text-dark transition-all duration-300 hover:shadow-lg hover:shadow-primary/50/50 flex flex-col"
                  >
                    <CardContent className="p-6">
                      <div className="flex items-start gap-4">
                        <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center flex-shrink-0">
                          <partnership.icon className="w-6 h-6 text-purple-600" />
                        </div>
                        <div className="flex-1">
                          <h3 className="text-lg font-semibold text-text-dark mb-2">
                            {partnership.type} Partners
                          </h3>
                          <div className="flex flex-wrap gap-2 mb-4">
                            {partnership.partners.map((partner, partnerIndex) => (
                              <Badge
                                key={partnerIndex}
                                variant="outline"
                                className="text-text-dark"
                              >
                                {partner}
                              </Badge>
                            ))}
                          </div>
                          <p className="text-text-dark/80">{partnership.impact}</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </ScrollReveal>
              ))}
            </div>
          </TabsContent>

          {/* Challenges & Solutions Tab */}
          <TabsContent value="challenges" className="space-y-8">
            <ScrollReveal>
              <div className="text-center mt-10 mb-12">
                <h2 className="text-4xl font-bold text-text-dark mb-4">
                  Challenges & Solutions
                </h2>
                <p className="text-xl text-text-dark max-w-2xl mx-auto">
                  Addressing key challenges in scaling emergency blood donation
                  technology
                </p>
              </div>
            </ScrollReveal>

            <div className="space-y-6">
              {challenges.map((item, index) => (
                <ScrollReveal key={index} delay={index * 0.1}>
                  <Card
                    className="glass-morphism border border-white/20 text-text-dark transition-all duration-300 hover:shadow-lg hover:shadow-primary/50/50 flex flex-col"
                  >
                    <CardContent className="p-6">
                      <div className="flex items-start gap-4">
                        <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center flex-shrink-0">
                          <AlertTriangle className="w-6 h-6 text-orange-600" />
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-3">
                            <h3 className="text-lg font-semibold text-text-dark">
                              {item.challenge}
                            </h3>
                            <Badge
                              className={
                                item.priority === "Critical"
                                  ? "bg-red-100 text-red-800"
                                  : item.priority === "High"
                                  ? "bg-orange-100 text-orange-800"
                                  : "bg-yellow-100 text-yellow-800"
                              }
                            >
                              {item.priority} Priority
                            </Badge>
                          </div>
                          <p className="text-text-dark/80 mb-4">{item.description}</p>
                          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                            <h4 className="font-medium text-green-800 mb-2">
                              Our Solution:
                            </h4>
                            <p className="text-green-700">{item.solution}</p>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </ScrollReveal>
              ))}
            </div>

            {/* Future Outlook */}
            <ScrollReveal delay={0.4}>
              <Card className="glass-morphism border border-white/20 text-text-dark transition-all duration-300 hover:shadow-lg hover:shadow-primary/50/50 flex flex-col">
                <CardHeader>
                  <CardTitle className="text-center text-2xl text-text-dark">
                    Future Outlook
                  </CardTitle>
                  <CardDescription className="text-center text-text-dark/80">
                    Our vision for the next decade of emergency healthcare
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="grid md:grid-cols-2 gap-8">
                    <div>
                      <h4 className="font-semibold text-lg mb-4 text-text-dark">
                        2025-2027: Expansion Phase
                      </h4>
                      <ul className="space-y-2 text-text-dark">
                        <li className="flex items-center gap-2">
                          <CheckCircle className="w-4 h-4 text-green-500" />
                          Coverage beyond India
                        </li>
                        <li className="flex items-center gap-2">
                          <CheckCircle className="w-4 h-4 text-green-500" />
                          AI-powered predictive analytics
                        </li>
                        <li className="flex items-center gap-2">
                          <CheckCircle className="w-4 h-4 text-green-500" />
                          Integration with national health systems
                        </li>
                        <li className="flex items-center gap-2">
                          <CheckCircle className="w-4 h-4 text-green-500" />
                          Mobile-first approach for developing regions
                        </li>
                      </ul>
                    </div>
                    <div>
                      <h4 className="font-semibold text-lg mb-4 text-text-dark">
                        2028-2030: Innovation Phase
                      </h4>
                      <ul className="space-y-2 text-text-dark">
                        <li className="flex items-center gap-2">
                          <CheckCircle className="w-4 h-4 text-blue-500" />
                          IoT-enabled blood monitoring systems
                        </li>
                        <li className="flex items-center gap-2">
                          <CheckCircle className="w-4 h-4 text-blue-500" />
                          Drone delivery coordination
                        </li>
                        <li className="flex items-center gap-2">
                          <CheckCircle className="w-4 h-4 text-blue-500" />
                          Blockchain-verified donation records
                        </li>
                        <li className="flex items-center gap-2">
                          <CheckCircle className="w-4 h-4 text-blue-500" />
                          AR/VR training and education modules
                        </li>
                      </ul>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </ScrollReveal>
          </TabsContent>
        </Tabs>

        {/* Call to Action */}
        <ScrollReveal>
          <Card className="bg-white/10 mt-16 backdrop-blur-sm border border-white/20 text-text-dark transition-all duration-300 hover:shadow-lg hover:shadow-primary/50/50 text-center">
            <CardContent className="p-12 text-center">
              <h2 className="text-3xl font-bold mb-4 text-text-dark">Join the Revolution</h2>
              <p className="text-xl mb-8 text-text-dark/90">
                Be part of the future of emergency healthcare. Every donation,
                every alert response, every life saved matters.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Link href="/auth/register?role=donor">
                  <Button
                    size="lg"
                    variant="secondary"
                    className="text-lg px-8 py-3"
                  >
                    <Heart className="w-5 h-5 mr-2" />
                    Become a Donor
                  </Button>
                </Link>
                <Link href="/auth/register?role=hospital">
                  <Button
                    size="lg"
                    variant="outline"
                    className="text-lg px-8 py-3 text-text-dark border-text-dark hover:bg-text-dark/10 bg-transparent"
                  >
                    <Building className="w-5 h-5 mr-2" />
                    Partner with Us
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        </ScrollReveal>
      </div>
    </GradientBackground>
  );
}
