import {
  Heart,
  MapPin,
  Users,
  Bell,
  Shield,
  Activity,
  Globe,
} from "lucide-react";

export const features = [
  {
    icon: Bell,
    title: "Real-Time Alerts",
    description:
      "Instant notifications when blood is critically needed in your area",
  },
  {
    icon: MapPin,
    title: "Geolocation Matching",
    description:
      "Find eligible donors within customizable radius using advanced geospatial queries",
  },
  {
    icon: Users,
    title: "Multi-Role Dashboard",
    description:
      "Separate interfaces for donors, hospitals, and administrators",
  },
  {
    icon: Shield,
    title: "Secure & Verified",
    description:
      "OTP verification, data encryption, and role-based access control",
  },
];

export const stats = [
  { label: "Lives Saved", value: "10,000+", icon: Heart },
  { label: "Active Donors", value: "25,000+", icon: Users },
  { label: "Partner Hospitals", value: "150+", icon: Activity },
  { label: "Cities Covered", value: "50+", icon: Globe },
];

export const steps = [
  {
    step: "1",
    icon: "🏥",
    title: "Emergency Request",
    description:
      "Hospital raises an emergency request when a blood type is critically low",
    delay: "0s",
  },
  {
    step: "2",
    icon: "🔔",
    title: "Instant Alerts",
    description:
      "HaemoLogix instantly alerts nearby eligible donors (correct blood group, donation gap maintained)",
    delay: "0.3s",
  },
  {
    step: "3",
    icon: "📱",
    title: "Donor Response",
    description: "Donors accept requests via SMS, email, or app notification",
    delay: "0.6s",
  },
  {
    step: "4",
    icon: "👁️",
    title: "Live Tracking",
    description:
      "Hospital sees live donor responses and can request units from nearby hospitals if needed",
    delay: "0.9s",
  },
  {
    step: "5",
    icon: "❤️",
    title: "Lives Saved",
    description: "Request fulfilled quickly, saving valuable time and lives",
    delay: "1.2s",
  },
];

export const CarouselData = [
  {
    title: "City General Hospital",
    image:
      "https://images.unsplash.com/photo-1586773860418-d37222d8fce3?w=400&h=300&fit=crop",
    type: "hospital",
  },
  {
    title: "Our Dedicated Donors",
    image:
      "https://images.unsplash.com/photo-1559757148-5c350d0d3c56?w=400&h=300&fit=crop",
    type: "donors",
  },
  {
    title: "St. Mary's Medical Center",
    image:
      "https://images.unsplash.com/photo-1551190822-a9333d879b1f?w=400&h=300&fit=crop",
    type: "hospital",
  },
  {
    title: "Blood Drive Events",
    image:
      "https://tmckolkata.com/in/wp-content/uploads/2021/06/blood_donation1.jpg",
    type: "event",
  },
  {
    title: "Regional Medical Hub",
    image:
      "https://images.unsplash.com/photo-1538108149393-fbbd81895907?w=400&h=300&fit=crop",
    type: "hospital",
  },
  {
    title: "Community Heroes",
    image:
      "https://images.unsplash.com/photo-1582750433449-648ed127bb54?w=400&h=300&fit=crop",
    type: "donors",
  },
  {
    title: "Emergency Response Team",
    image:
      "https://images.unsplash.com/photo-1516549655169-df83a0774514?w=400&h=300&fit=crop",
    type: "team",
  },
];
