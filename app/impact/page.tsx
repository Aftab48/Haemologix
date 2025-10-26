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
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Heart,
  TrendingUp,
  Globe,
  Users,
  Clock,
  Target,
  Shield,
  Brain,
  ArrowRight,
  CheckCircle,
  Star,
  Award,
  BarChart3,
  MapPin,
  Lightbulb,
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
import {
  SignedIn,
  SignedOut,
  SignInButton,
  SignUpButton,
  UserButton,
} from "@clerk/nextjs";
import GradientBackground from "@/components/GradientBackground";

export default function ImpactAndProspects() {
  const [activeTab, setActiveTab] = useState("current-impact");

  const TAB_ITEMS = [
    { value: "current-impact", label: "Current Impact" },
    { value: "social-transformation", label: "Social Impact" },
    { value: "technology-roadmap", label: "Technology Roadmap" },
    { value: "partnerships", label: "Partnerships" },
    { value: "challenges", label: "Challenges & Solutions" },
  ];

  const currentImpact = {
    livesSaved: 12456,
    donationsEnabled: 18234,
    responseTimeReduction: 75,
    hospitalsCovered: 156,
    citiesActive: 52,
    averageResponseTime: 8.5,
    successRate: 89,
    costSavings: 2.4,
  };

  const futureGoals = [
    {
      category: "Scale",
      title: "National Coverage",
      description:
        "Expand to all major cities and rural areas across the country",
      target: "500+ hospitals, 100+ cities",
      timeline: "2025-2026",
      progress: 35,
      icon: Globe,
    },
    {
      category: "Technology",
      title: "AI-Powered Matching",
      description: "Advanced ML algorithms for optimal donor-hospital matching",
      target: "95% match accuracy",
      timeline: "2024-2025",
      progress: 60,
      icon: Brain,
    },
    {
      category: "Integration",
      title: "Healthcare System Integration",
      description: "Direct integration with hospital management systems",
      target: "80% of partner hospitals",
      timeline: "2025",
      progress: 25,
      icon: Network,
    },
    {
      category: "Innovation",
      title: "Predictive Analytics",
      description: "Forecast blood demand and prevent shortages proactively",
      target: "70% shortage prevention",
      timeline: "2026",
      progress: 15,
      icon: TrendingUp,
    },
  ];

  const socialImpact = [
    {
      metric: "Emergency Response Time",
      before: "45-60 minutes",
      after: "8-12 minutes",
      improvement: "80% faster",
      icon: Clock,
    },
    {
      metric: "Donor Mobilization",
      before: "Manual calls, 2-3 hours",
      after: "Instant alerts, 15 minutes",
      improvement: "90% faster",
      icon: Users,
    },
    {
      metric: "Geographic Coverage",
      before: "Urban centers only",
      after: "Urban + rural areas",
      improvement: "300% expansion",
      icon: MapPin,
    },
    {
      metric: "Cost Efficiency",
      before: "$500 per donation",
      after: "$125 per donation",
      improvement: "75% reduction",
      icon: Target,
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
      type: "Healthcare",
      partners: ["WHO", "Red Cross", "National Blood Banks"],
      impact: "Global standards compliance and best practices",
      icon: Heart,
    },
    {
      type: "Technology",
      partners: ["Google Health", "Microsoft Healthcare", "AWS"],
      impact: "Advanced AI capabilities and cloud infrastructure",
      icon: Brain,
    },
    {
      type: "Government",
      partners: [
        "Ministry of Health",
        "Emergency Services",
        "Public Health Agencies",
      ],
      impact: "Policy support and regulatory compliance",
      icon: Shield,
    },
    {
      type: "Academic",
      partners: [
        "Medical Universities",
        "Research Institutes",
        "Innovation Labs",
      ],
      impact: "Research collaboration and evidence-based improvements",
      icon: Award,
    },
  ];

  const challenges = [
    {
      challenge: "Privacy & Data Security",
      description:
        "Protecting sensitive health information while enabling real-time sharing",
      solution:
        "End-to-end encryption, HIPAA compliance, blockchain verification",
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
      <img
        src="https://fbe.unimelb.edu.au/__data/assets/image/0006/3322347/varieties/medium.jpg"
        className="w-full h-full object-cover absolute mix-blend-overlay opacity-20"
      />
      {/* Header */}
      <header className="backdrop-blur-lg sticky top-4 mx-4 md:mx-8 lg:mx-16 z-50 border border-mist-green/40 glass-morphism rounded-2xl shadow-lg px-6 py-3 flex justify-between items-center">
        <div className="container mx-auto px-2 md:px-4 py-2 md:py-4 flex items-center justify-between gap-px rounded bg-transparent">
          <div className="flex items-center gap-2">
            <div className="w-12 h-12 rounded-full flex items-center justify-center bg-primary/10 border-2 border-primary animate-glow">
              <Image
                src="/logo.png"
                alt="Logo"
                width={48}
                height={48}
                className="rounded-full"
              />
            </div>
            <Link href={"/"} className="text-xl font-outfit font-bold text-primary">
              {"HaemoLogix"}
            </Link>
          </div>
          <nav className="hidden md:flex items-center gap-6">
            <Link
              href="/#features"
              className="text-text-dark font-dm-sans hover:text-secondary transition-colors"
            >
              Features
            </Link>
            <Link
              href="/impact"
              className="text-text-dark font-dm-sans hover:text-secondary transition-colors"
            >
              Impact
            </Link>
            <Link
              href="/contact"
              className="text-text-dark font-dm-sans hover:text-secondary transition-colors"
            >
              Contact
            </Link>
          </nav>
          <div className="flex items-center gap-1 md:gap-3">
            <SignedOut>
              <SignInButton>
                <Button className="gradient-oxygen hover:opacity-90 text-white rounded-full font-medium text-sm sm:text-base h-8 sm:h-10 px-4 sm:px-5 cursor-pointer">
                  Sign In
                </Button>
              </SignInButton>
              <div className="hidden lg:block">
                <SignUpButton>
                  <Button className="gradient-ruby hover:opacity-90 text-white rounded-full font-medium text-sm sm:text-base h-8 sm:h-10 px-4 sm:px-5 cursor-pointer shadow-lg hover:shadow-primary/50">
                    Sign Up
                  </Button>
                </SignUpButton>
              </div>
            </SignedOut>
            <SignedIn>
              <UserButton />
            </SignedIn>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="py-16 px-4">
        <div className="container mx-auto text-center">
          <Badge className="mb-4 hover:bg-red-100 text-[rgba(127,29,29,1)] bg-[rgba(204,165,165,1)]">
            🌟 Transforming Emergency Healthcare
          </Badge>
          <h1 className="text-5xl md:text-6xl font-bold text-black mb-6 leading-tight">
            Impact & Future
            <span className="text-red-500 block">Prospects</span>
          </h1>
          <p className="text-xl text-white mb-8 max-w-3xl mx-auto leading-relaxed">
            Discover how ect is revolutionizing emergency blood donation and our
            vision for the future of healthcare technology.
          </p>
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
            {TAB_ITEMS.map((t, i) => (
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
            <div className="text-center mt-10 mb-12">
              <h2 className="text-4xl font-bold text-white mb-4">
                Measurable Impact Today
              </h2>
              <p className="text-xl text-white max-w-2xl mx-auto">
                Real numbers showing how Haemologix is already saving lives and
                transforming emergency healthcare
              </p>
            </div>

            {/* Key Metrics */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-12">
              <Card className="glass-morphism border border-white/20 text-white transition-all duration-300 hover:shadow-lg hover:shadow-primary/50/50 text-center">
                <CardContent className="p-8">
                  <Heart className="w-12 h-12 text-red-600 mx-auto mb-4" />
                  <div className="text-4xl font-bold text-white mb-2">
                    {currentImpact.livesSaved.toLocaleString()}
                  </div>
                  <div className="text-white">Lives Saved</div>
                  <div className="text-sm text-green-600 mt-2">
                    ↑ 23% this month
                  </div>
                </CardContent>
              </Card>

              <Card className="glass-morphism border border-white/20 text-white transition-all duration-300 hover:shadow-lg hover:shadow-primary/50/50 text-center">
                <CardContent className="p-8">
                  <Users className="w-12 h-12 text-blue-600 mx-auto mb-4" />
                  <div className="text-4xl font-bold text-white mb-2">
                    {currentImpact.donationsEnabled.toLocaleString()}
                  </div>
                  <div className="text-white">Donations Enabled</div>
                  <div className="text-sm text-green-600 mt-2">
                    ↑ 18% this month
                  </div>
                </CardContent>
              </Card>

              <Card className="glass-morphism border border-white/20 text-white transition-all duration-300 hover:shadow-lg hover:shadow-primary/50/50 text-center">
                <CardContent className="p-8">
                  <Clock className="w-12 h-12 text-green-600 mx-auto mb-4" />
                  <div className="text-4xl font-bold text-white mb-2">
                    {currentImpact.averageResponseTime}m
                  </div>
                  <div className="text-white">Avg Response Time</div>
                  <div className="text-sm text-green-600 mt-2">
                    ↓ 75% improvement
                  </div>
                </CardContent>
              </Card>

              <Card className="glass-morphism border border-white/20 text-white transition-all duration-300 hover:shadow-lg hover:shadow-primary/50/50 text-center">
                <CardContent className="p-8">
                  <Target className="w-12 h-12 text-purple-600 mx-auto mb-4" />
                  <div className="text-4xl font-bold text-white mb-2">
                    {currentImpact.successRate}%
                  </div>
                  <div className="text-white">Success Rate</div>
                  <div className="text-sm text-green-600 mt-2">
                    ↑ 12% this quarter
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Geographic Impact */}
            <div className="grid md:grid-cols-2 gap-8">
              <Card className="glass-morphism border border-white/20 text-white transition-all duration-300 hover:shadow-lg hover:shadow-primary/50/50 ">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Globe className="w-5 h-5" />
                    Geographic Reach
                  </CardTitle>
                  <CardDescription className="text-white">
                    Platform coverage and expansion metrics
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="flex justify-between items-center">
                    <span>Active Cities</span>
                    <div className="flex items-center gap-2">
                      <span className="text-2xl font-bold">
                        {currentImpact.citiesActive}
                      </span>
                      <Badge className="bg-green-100 text-green-800">
                        +8 this quarter
                      </Badge>
                    </div>
                  </div>
                  <div className="flex justify-between items-center">
                    <span>Partner Hospitals</span>
                    <div className="flex items-center gap-2">
                      <span className="text-2xl font-bold">
                        {currentImpact.hospitalsCovered}
                      </span>
                      <Badge className="bg-blue-100 text-blue-800">
                        +23 this quarter
                      </Badge>
                    </div>
                  </div>
                  <div className="flex justify-between items-center">
                    <span>Rural Coverage</span>
                    <div className="flex items-center gap-2">
                      <span className="text-2xl font-bold">35%</span>
                      <Badge className="bg-orange-100 text-orange-800">
                        Growing
                      </Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="glass-morphism border border-white/20 text-white transition-all duration-300 hover:shadow-lg hover:shadow-primary/50/50">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <BarChart3 className="w-5 h-5" />
                    Economic Impact
                  </CardTitle>
                  <CardDescription className="text-white">
                    Cost savings and efficiency improvements
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="flex justify-between items-center">
                    <span>Healthcare Cost Savings</span>
                    <div className="flex items-center gap-2">
                      <span className="text-2xl font-bold">
                        ${currentImpact.costSavings}M
                      </span>
                      <Badge className="bg-green-100 text-green-800">
                        Annual
                      </Badge>
                    </div>
                  </div>
                  <div className="flex justify-between items-center">
                    <span>Operational Efficiency</span>
                    <div className="flex items-center gap-2">
                      <span className="text-2xl font-bold">75%</span>
                      <Badge className="bg-blue-100 text-blue-800">
                        Improvement
                      </Badge>
                    </div>
                  </div>
                  <div className="flex justify-between items-center">
                    <span>Resource Optimization</span>
                    <div className="flex items-center gap-2">
                      <span className="text-2xl font-bold">60%</span>
                      <Badge className="bg-purple-100 text-purple-800">
                        Better allocation
                      </Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Social Transformation Tab */}
          <TabsContent value="social-transformation" className="space-y-8">
            <div className="text-center mt-10 mb-12">
              <h2 className="text-4xl font-bold text-white mb-4">
                Transforming Emergency Healthcare
              </h2>
              <p className="text-xl text-white max-w-2xl mx-auto">
                How Haemologix is revolutionizing the way we respond to medical
                emergencies
              </p>
            </div>

            <div className="grid gap-8 md:grid-cols-2">
              {socialImpact.map((impact, index) => (
                <Card
                  key={index}
                  className="glass-morphism border border-white/20 text-white transition-all duration-300 hover:shadow-lg hover:shadow-primary/50/50 flex flex-col"
                >
                  <CardContent className="p-6 flex flex-col justify-between h-full">
                    {/* Header: Icon + Title */}
                    <div className="flex items-center gap-4 mb-6">
                      <div className="w-14 h-14 bg-red-100 rounded-xl flex items-center justify-center">
                        <impact.icon className="w-7 h-7 text-red-600" />
                      </div>
                      <h3 className="text-xl font-semibold text-white">
                        {impact.metric}
                      </h3>
                    </div>

                    {/* Content Grid */}
                    <div className="grid grid-cols-3 items-center text-center gap-4">
                      {/* Before */}
                      <div>
                        <div className="text-sm text-gray-300 mb-1">
                          Before Haemologix
                        </div>
                        <div className="text-lg font-semibold text-red-500">
                          {impact.before}
                        </div>
                      </div>

                      {/* Improvement */}
                      <div className="flex flex-col items-center">
                        <ArrowRight className="w-6 h-6 text-gray-400 mb-2" />
                        <Badge className="bg-green-100 text-green-800 text-sm px-3 py-1">
                          {impact.improvement}
                        </Badge>
                      </div>

                      {/* After */}
                      <div>
                        <div className="text-sm text-gray-300 mb-1">
                          With Haemologix
                        </div>
                        <div className="text-lg font-semibold text-green-500">
                          {impact.after}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Success Stories */}
            <Card className="glass-morphism border border-white/20 text-white transition-all duration-300 hover:shadow-lg hover:shadow-primary/50/50 flex flex-col">
              <CardHeader>
                <CardTitle className="text-center text-2xl">
                  Success Stories
                </CardTitle>
                <CardDescription className="text-center">
                  Real impact on communities and individuals
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid md:grid-cols-3 gap-6">
                  <div className="text-center">
                    <Star className="w-8 h-8 text-yellow-500 mx-auto mb-3" />
                    <h4 className="font-semibold mb-2">
                      Emergency Surgery Success
                    </h4>
                    <p className="text-sm text-white">
                      "Haemologix helped us find 3 O- donors in 12 minutes for a
                      critical surgery. The patient made a full recovery."
                    </p>
                    <p className="text-xs text-gray-500 mt-2">
                      - Dr. Sarah Chen, City General Hospital
                    </p>
                  </div>
                  <div className="text-center">
                    <Heart className="w-8 h-8 text-red-500 mx-auto mb-3" />
                    <h4 className="font-semibold mb-2">Rural Area Coverage</h4>
                    <p className="text-sm text-white">
                      "For the first time, our rural hospital can quickly
                      mobilize donors from nearby towns. It's been
                      life-changing."
                    </p>
                    <p className="text-xs text-gray-500 mt-2">
                      - Nurse Manager, Rural Health Center
                    </p>
                  </div>
                  <div className="text-center">
                    <Users className="w-8 h-8 text-blue-500 mx-auto mb-3" />
                    <h4 className="font-semibold mb-2">Community Engagement</h4>
                    <p className="text-sm text-white">
                      "I've donated 8 times this year through Haemologix alerts.
                      It feels great to help save lives in my community."
                    </p>
                    <p className="text-xs text-gray-500 mt-2">
                      - John M., Regular Donor
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Technology Roadmap Tab */}
          <TabsContent value="technology-roadmap" className="space-y-8">
            <div className="text-center mt-10 mb-12">
              <h2 className="text-4xl font-bold text-white mb-4">
                Technology Evolution
              </h2>
              <p className="text-xl text-white max-w-2xl mx-auto">
                Our roadmap for advancing blood donation technology and
                expanding global impact
              </p>
            </div>

            {/* Future Goals */}
            <div className="grid md:grid-cols-2 gap-6 mb-12">
              {futureGoals.map((goal, index) => (
                <Card
                  key={index}
                  className="glass-morphism border border-white/20 text-white transition-all duration-300 hover:shadow-lg hover:shadow-primary/50/50 flex flex-col"
                >
                  <CardContent className="p-6">
                    <div className="flex items-start gap-4">
                      <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
                        <goal.icon className="w-6 h-6 text-blue-600" />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <Badge variant="outline">{goal.category}</Badge>
                          <Badge className="bg-gray-100 text-gray-800">
                            {goal.timeline}
                          </Badge>
                        </div>
                        <h3 className="text-lg font-semibold text-white mb-2">
                          {goal.title}
                        </h3>
                        <p className="text-white mb-4">{goal.description}</p>
                        <div className="space-y-2">
                          <div className="flex justify-between text-sm">
                            <span>Target: {goal.target}</span>
                            <span>{goal.progress}% complete</span>
                          </div>
                          <Progress value={goal.progress} className="h-2" />
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Technology Roadmap Timeline */}
            <Card className="glass-morphism border border-white/20 text-white transition-all duration-300 hover:shadow-lg hover:shadow-primary/50/50 flex flex-col">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Rocket className="w-5 h-5" />
                  Development Timeline
                </CardTitle>
                <CardDescription>
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
                          <h3 className="text-lg font-semibold">
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
                          <span className="text-sm text-gray-500">
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
                              <span className="text-sm">{feature}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Partnerships Tab */}
          <TabsContent value="partnerships" className="space-y-8">
            <div className="text-center mt-10 mb-12">
              <h2 className="text-4xl font-bold text-white mb-4">
                Strategic Partnerships
              </h2>
              <p className="text-xl text-white max-w-2xl mx-auto">
                Collaborating with leading organizations to maximize impact and
                drive innovation
              </p>
            </div>

            <div className="grid md:grid-cols-2 gap-8">
              {partnerships.map((partnership, index) => (
                <Card
                  key={index}
                  className="glass-morphism border border-white/20 text-white transition-all duration-300 hover:shadow-lg hover:shadow-primary/50/50 flex flex-col"
                >
                  <CardContent className="p-6">
                    <div className="flex items-start gap-4">
                      <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center flex-shrink-0">
                        <partnership.icon className="w-6 h-6 text-purple-600" />
                      </div>
                      <div className="flex-1">
                        <h3 className="text-lg font-semibold text-white mb-2">
                          {partnership.type} Partners
                        </h3>
                        <div className="flex flex-wrap gap-2 mb-4">
                          {partnership.partners.map((partner, partnerIndex) => (
                            <Badge
                              key={partnerIndex}
                              variant="outline"
                              className="text-white"
                            >
                              {partner}
                            </Badge>
                          ))}
                        </div>
                        <p className="text-white">{partnership.impact}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Partnership Benefits */}
            <Card className="glass-morphism border border-white/20 text-white transition-all duration-300 hover:shadow-lg hover:shadow-primary/50/50 flex flex-col">
              <CardHeader>
                <CardTitle className="text-center">
                  Partnership Benefits
                </CardTitle>
                <CardDescription className="text-center">
                  How strategic alliances amplify our impact
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid md:grid-cols-3 gap-6">
                  <div className="text-center">
                    <Network className="w-8 h-8 text-blue-600 mx-auto mb-3" />
                    <h4 className="font-semibold mb-2">Global Reach</h4>
                    <p className="text-sm text-white">
                      Access to international networks and best practices from
                      leading healthcare organizations
                    </p>
                  </div>
                  <div className="text-center">
                    <Lightbulb className="w-8 h-8 text-yellow-600 mx-auto mb-3" />
                    <h4 className="font-semibold mb-2">Innovation</h4>
                    <p className="text-sm text-white">
                      Cutting-edge technology and research capabilities through
                      academic and tech partnerships
                    </p>
                  </div>
                  <div className="text-center">
                    <Shield className="w-8 h-8 text-green-600 mx-auto mb-3" />
                    <h4 className="font-semibold mb-2">Trust & Credibility</h4>
                    <p className="text-sm text-white">
                      Enhanced credibility and trust through associations with
                      respected healthcare institutions
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Challenges & Solutions Tab */}
          <TabsContent value="challenges" className="space-y-8">
            <div className="text-center mt-10 mb-12">
              <h2 className="text-4xl font-bold text-white mb-4">
                Challenges & Solutions
              </h2>
              <p className="text-xl text-white max-w-2xl mx-auto">
                Addressing key challenges in scaling emergency blood donation
                technology
              </p>
            </div>

            <div className="space-y-6">
              {challenges.map((item, index) => (
                <Card
                  key={index}
                  className="glass-morphism border border-white/20 text-white transition-all duration-300 hover:shadow-lg hover:shadow-primary/50/50 flex flex-col"
                >
                  <CardContent className="p-6">
                    <div className="flex items-start gap-4">
                      <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center flex-shrink-0">
                        <AlertTriangle className="w-6 h-6 text-orange-600" />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-3">
                          <h3 className="text-lg font-semibold text-white">
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
                        <p className="text-white mb-4">{item.description}</p>
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
              ))}
            </div>

            {/* Future Outlook */}
            <Card className="glass-morphism border border-white/20 text-white transition-all duration-300 hover:shadow-lg hover:shadow-primary/50/50 flex flex-col">
              <CardHeader>
                <CardTitle className="text-center text-2xl">
                  Future Outlook
                </CardTitle>
                <CardDescription className="text-center">
                  Our vision for the next decade of emergency healthcare
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid md:grid-cols-2 gap-8">
                  <div>
                    <h4 className="font-semibold text-lg mb-4">
                      2025-2027: Expansion Phase
                    </h4>
                    <ul className="space-y-2 text-white">
                      <li className="flex items-center gap-2">
                        <CheckCircle className="w-4 h-4 text-green-500" />
                        Global platform covering 50+ countries
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
                    <h4 className="font-semibold text-lg mb-4">
                      2028-2030: Innovation Phase
                    </h4>
                    <ul className="space-y-2 text-white">
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
          </TabsContent>
        </Tabs>

        {/* Call to Action */}
        <Card className="bg-white/10 mt-16 backdrop-blur-sm border border-white/20 text-white transition-all duration-300 hover:shadow-lg hover:shadow-primary/50/50 text-center">
          <CardContent className="p-12 text-center">
            <h2 className="text-3xl font-bold mb-4">Join the Revolution</h2>
            <p className="text-xl mb-8 opacity-90">
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
                  className="text-lg px-8 py-3 text-white border-white hover:bg-white hover:text-red-600 bg-transparent"
                >
                  <Building className="w-5 h-5 mr-2" />
                  Partner with Us
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </GradientBackground>
  );
}
