"use client";

import { useMemo } from "react";
import { GoogleMap, Marker, InfoWindow, useLoadScript } from "@react-google-maps/api";
import { MapPin, Clock } from "lucide-react";
import {
  haversineDistanceKm,
  calculateDonorEta,
  transportModeLabel,
} from "@/lib/distanceEta";

interface DonorLocation {
  id: string;
  name: string;
  latitude: string;
  longitude: string;
  phone?: string;
  bloodGroup?: string;
}

interface HospitalLocation {
  latitude: string;
  longitude: string;
  name: string;
}

interface DonorLocationMapProps {
  donor: DonorLocation;
  hospital: HospitalLocation;
  mapContainerStyle?: React.CSSProperties;
}

const defaultMapContainerStyle: React.CSSProperties = {
  width: "100%",
  height: "400px",
  borderRadius: "8px",
};

const defaultCenter = {
  lat: 20.5937, // India center
  lng: 78.9629,
};

export default function DonorLocationMap({
  donor,
  hospital,
  mapContainerStyle = defaultMapContainerStyle,
}: DonorLocationMapProps) {
  const donorLat = parseFloat(donor.latitude);
  const donorLng = parseFloat(donor.longitude);
  const hospitalLat = parseFloat(hospital.latitude);
  const hospitalLng = parseFloat(hospital.longitude);

  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;

  const { isLoaded } = useLoadScript({
    googleMapsApiKey: apiKey || "",
  });

  // Create icon helper function - only when maps is loaded
  const createIcon = (color: string, letter: string) => {
    if (isLoaded && typeof window !== "undefined" && window.google?.maps) {
      return {
        url: "data:image/svg+xml;charset=UTF-8," + encodeURIComponent(`
          <svg width="32" height="32" viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg">
            <circle cx="16" cy="16" r="12" fill="${color}" stroke="#fff" stroke-width="2"/>
            <text x="16" y="20" font-size="16" fill="white" text-anchor="middle" font-weight="bold">${letter}</text>
          </svg>
        `),
        scaledSize: new window.google.maps.Size(32, 32),
      };
    }
    return undefined;
  };

  // Calculate center point between donor and hospital
  const center = useMemo(() => {
    if (!isNaN(donorLat) && !isNaN(donorLng)) {
      // Center between donor and hospital
      if (!isNaN(hospitalLat) && !isNaN(hospitalLng)) {
        return {
          lat: (donorLat + hospitalLat) / 2,
          lng: (donorLng + hospitalLng) / 2,
        };
      }
      return { lat: donorLat, lng: donorLng };
    }
    return defaultCenter;
  }, [donorLat, donorLng, hospitalLat, hospitalLng]);

  // Distance and ETA (donor → hospital)
  const distanceAndEta = useMemo(() => {
    if (
      isNaN(donorLat) ||
      isNaN(donorLng) ||
      isNaN(hospitalLat) ||
      isNaN(hospitalLng)
    )
      return null;
    const distanceKm = haversineDistanceKm(
      donorLat,
      donorLng,
      hospitalLat,
      hospitalLng
    );
    return calculateDonorEta(distanceKm);
  }, [donorLat, donorLng, hospitalLat, hospitalLng]);

  // Calculate bounds to fit both markers (will be set in onLoad callback)
  const hasBothLocations =
    !isNaN(donorLat) &&
    !isNaN(donorLng) &&
    !isNaN(hospitalLat) &&
    !isNaN(hospitalLng);

  if (!apiKey) {
    return (
      <div className="flex items-center justify-center h-[400px] bg-white/5 rounded-lg border border-white/20">
        <div className="text-center text-white/70">
          <MapPin className="w-8 h-8 mx-auto mb-2 opacity-50" />
          <p>Google Maps API key not configured</p>
        </div>
      </div>
    );
  }

  if (isNaN(donorLat) || isNaN(donorLng)) {
    return (
      <div className="flex items-center justify-center h-[400px] bg-white/5 rounded-lg border border-white/20">
        <div className="text-center text-white/70">
          <MapPin className="w-8 h-8 mx-auto mb-2 opacity-50" />
          <p>Donor location not available</p>
        </div>
      </div>
    );
  }

  if (!isLoaded) {
    return (
      <div className="flex items-center justify-center h-[400px] bg-white/5 rounded-lg border border-white/20">
        <div className="text-center text-white/70">
          <div className="w-8 h-8 border-4 border-yellow-600 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
          <p>Loading map...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {distanceAndEta && (
        <div className="flex flex-wrap items-center gap-3 text-sm text-white/90 bg-white/5 rounded-lg px-3 py-2 border border-white/10">
          <span className="flex items-center gap-1.5">
            <MapPin className="w-4 h-4 text-emerald-400" />
            <strong>{distanceAndEta.distanceKm.toFixed(1)} km</strong>
            <span className="text-white/70">to hospital</span>
          </span>
          <span className="flex items-center gap-1.5">
            <Clock className="w-4 h-4 text-amber-400" />
            <strong>~{distanceAndEta.recommendedEtaMinutes} min</strong>
            <span className="text-white/70">
              ETA ({transportModeLabel(distanceAndEta.recommendedMode)})
            </span>
          </span>
        </div>
      )}
      <GoogleMap
          mapContainerStyle={mapContainerStyle}
          center={center}
          zoom={hasBothLocations ? undefined : 12}
          options={{
            styles: [
              {
                featureType: "all",
                elementType: "geometry",
                stylers: [{ color: "#242f3e" }],
              },
              {
                featureType: "all",
                elementType: "labels.text.stroke",
                stylers: [{ color: "#242f3e" }],
              },
              {
                featureType: "all",
                elementType: "labels.text.fill",
                stylers: [{ color: "#746855" }],
              },
              {
                featureType: "water",
                elementType: "geometry",
                stylers: [{ color: "#17263c" }],
              },
              {
                featureType: "road",
                elementType: "geometry",
                stylers: [{ color: "#38414e" }],
              },
              {
                featureType: "poi",
                elementType: "geometry",
                stylers: [{ color: "#263238" }],
              },
            ],
            disableDefaultUI: false,
            zoomControl: true,
            streetViewControl: false,
            mapTypeControl: false,
            fullscreenControl: true,
          }}
          onLoad={(map) => {
            if (hasBothLocations && window.google?.maps) {
              const bounds = new window.google.maps.LatLngBounds();
              bounds.extend(new window.google.maps.LatLng(donorLat, donorLng));
              bounds.extend(new window.google.maps.LatLng(hospitalLat, hospitalLng));
              map.fitBounds(bounds, 50);
            }
          }}
        >
          {/* Hospital Marker */}
          {!isNaN(hospitalLat) && !isNaN(hospitalLng) && (
            <Marker
              position={{ lat: hospitalLat, lng: hospitalLng }}
              icon={createIcon("#ef4444", "H")}
              label={{
                text: hospital.name,
                color: "#fff",
                fontSize: "12px",
                fontWeight: "bold",
              }}
            >
              <InfoWindow position={{ lat: hospitalLat, lng: hospitalLng }}>
                <div className="text-gray-800">
                  <p className="font-semibold">{hospital.name}</p>
                  <p className="text-sm">Hospital Location</p>
                </div>
              </InfoWindow>
            </Marker>
          )}

          {/* Donor Marker */}
          <Marker
            position={{ lat: donorLat, lng: donorLng }}
            icon={createIcon("#10b981", "D")}
            label={{
              text: donor.name,
              color: "#fff",
              fontSize: "12px",
              fontWeight: "bold",
            }}
          >
            <InfoWindow position={{ lat: donorLat, lng: donorLng }}>
              <div className="text-gray-800 min-w-[180px]">
                <p className="font-semibold">{donor.name}</p>
                {donor.bloodGroup && (
                  <p className="text-sm">Blood Group: {donor.bloodGroup}</p>
                )}
                {donor.phone && (
                  <p className="text-sm">Phone: {donor.phone}</p>
                )}
                {distanceAndEta && (
                  <>
                    <p className="text-sm mt-1 border-t border-gray-200 pt-1">
                      📍 {distanceAndEta.distanceKm.toFixed(1)} km to hospital
                    </p>
                    <p className="text-sm">
                      ⏱ ~{distanceAndEta.recommendedEtaMinutes} min ETA (
                      {transportModeLabel(distanceAndEta.recommendedMode)})
                    </p>
                  </>
                )}
                <p className="text-xs text-gray-500 mt-1">Donor Location</p>
              </div>
            </InfoWindow>
          </Marker>
        </GoogleMap>
    </div>
  );
}

