"use client";

import { useEffect, useRef, useState } from "react";
import { GoogleMap, Marker, Polyline, useLoadScript } from "@react-google-maps/api";
import { Bike, Building2, MapPin, Truck } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { deliveryProgress, deliveryStatusAt, interpolateTrack } from "@/lib/demo/delivery";
import type { DemoCoordinates, DemoDeliveryTrack } from "@/lib/demo/types";

export default function AnimatedLogisticsMap({
  tracks,
  serverTime,
}: {
  tracks: DemoDeliveryTrack[];
  serverTime: string;
}) {
  const [now, setNow] = useState(() => new Date(serverTime));
  const [mapRejected, setMapRejected] = useState(false);
  const mapWrapperRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const serverStartedAt = new Date(serverTime).getTime();
    const clientStartedAt = Date.now();
    const interval = window.setInterval(
      () => setNow(new Date(serverStartedAt + (Date.now() - clientStartedAt))),
      250
    );
    return () => window.clearInterval(interval);
  }, [serverTime]);

  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || "";
  const { isLoaded, loadError } = useLoadScript({ googleMapsApiKey: apiKey });
  const center = tracks[0]?.destination ?? { latitude: 22.5411, longitude: 88.3443 };

  useEffect(() => {
    if (!apiKey || !isLoaded) return;
    const wrapper = mapWrapperRef.current;
    if (!wrapper) return;

    const detectProviderFailure = () => {
      const providerError = wrapper.querySelector(".gm-err-container, .gm-err-content");
      if (providerError || wrapper.textContent?.includes("can't load Google Maps correctly")) {
        setMapRejected(true);
      }
    };
    const observer = new MutationObserver(detectProviderFailure);
    observer.observe(wrapper, { childList: true, subtree: true, characterData: true });
    detectProviderFailure();
    return () => observer.disconnect();
  }, [apiKey, isLoaded]);

  if (!apiKey || !isLoaded || loadError || mapRejected) {
    return <FallbackTracker tracks={tracks} now={now} />;
  }

  return (
    <div ref={mapWrapperRef} className="space-y-4">
      <GoogleMap
        mapContainerStyle={{ width: "100%", height: 430, borderRadius: 12 }}
        center={{ lat: center.latitude, lng: center.longitude }}
        zoom={12}
        options={{ streetViewControl: false, mapTypeControl: false, fullscreenControl: true }}
        onLoad={(map) => {
          if (!window.google?.maps || tracks.length === 0) return;
          const bounds = new window.google.maps.LatLngBounds();
          tracks.forEach((track) => {
            bounds.extend({ lat: track.origin.latitude, lng: track.origin.longitude });
            bounds.extend({ lat: track.destination.latitude, lng: track.destination.longitude });
          });
          map.fitBounds(bounds, 60);
        }}
      >
        {tracks.map((track) => {
          const position = interpolateTrack(track, now);
          const status = deliveryStatusAt(track, now);
          return (
            <PolylineAndMarker key={track.id} track={track} position={position} status={status} />
          );
        })}
      </GoogleMap>
      <TrackLegend tracks={tracks} now={now} />
    </div>
  );
}

function PolylineAndMarker({
  track,
  position,
  status,
}: {
  track: DemoDeliveryTrack;
  position: DemoCoordinates;
  status: string;
}) {
  const color = track.sourceType === "DONOR" ? "#10b981" : "#f59e0b";
  return (
    <>
      <Polyline
        path={[
          { lat: track.origin.latitude, lng: track.origin.longitude },
          { lat: track.destination.latitude, lng: track.destination.longitude },
        ]}
        options={{ strokeColor: color, strokeOpacity: 0.85, strokeWeight: 4 }}
      />
      <Marker position={{ lat: track.origin.latitude, lng: track.origin.longitude }} label={track.sourceType === "DONOR" ? "D" : "S"} title={track.sourceName} />
      <Marker position={{ lat: track.destination.latitude, lng: track.destination.longitude }} label="H" title="Destination hospital" />
      <Marker
        position={{ lat: position.latitude, lng: position.longitude }}
        label={{ text: track.sourceType === "DONOR" ? "●" : "◆", color: "white", fontSize: "15px" }}
        title={`${track.sourceName}: ${status}`}
        icon={
          typeof window !== "undefined" && window.google?.maps
            ? { path: window.google.maps.SymbolPath.CIRCLE, fillColor: color, fillOpacity: 1, strokeColor: "white", strokeWeight: 2, scale: 13 }
            : undefined
        }
      />
    </>
  );
}

function FallbackTracker({ tracks, now }: { tracks: DemoDeliveryTrack[]; now: Date }) {
  return (
    <div className="rounded-xl border border-white/15 bg-slate-950/65 p-5">
      <div className="mb-4 flex items-center gap-2 text-white"><MapPin className="h-5 w-5 text-yellow-400" /><strong>Animated route tracker</strong><span className="text-xs text-white/55">Map key not required</span></div>
      <div className="space-y-6">
        {tracks.map((track) => {
          const progress = deliveryProgress(track, now);
          const status = deliveryStatusAt(track, now);
          const Icon = track.sourceType === "DONOR" ? Bike : Truck;
          return (
            <div key={track.id}>
              <div className="mb-2 flex flex-wrap justify-between gap-2 text-sm text-white"><span>{track.sourceName} → Demo Medical Centre</span><Badge className={status === "DELIVERED" ? "bg-green-600" : "bg-blue-600"}>{status.replaceAll("_", " ")}</Badge></div>
              <div className="relative h-10 rounded-full bg-white/10">
                <div className="absolute left-4 right-4 top-1/2 h-1 -translate-y-1/2 rounded bg-white/20" />
                <div className="absolute left-4 top-1/2 h-1 -translate-y-1/2 rounded bg-gradient-to-r from-emerald-500 to-yellow-500" style={{ width: `calc((100% - 2rem) * ${progress})` }} />
                <div className="absolute top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-yellow-500 p-2 text-slate-950 shadow-lg transition-[left] duration-200" style={{ left: `calc(1rem + (100% - 2rem) * ${progress})` }}><Icon className="h-4 w-4" /></div>
                <Building2 className="absolute right-2 top-1/2 h-5 w-5 -translate-y-1/2 text-white" />
              </div>
              <div className="mt-2 flex justify-between text-xs text-white/60"><span>{track.distanceKm.toFixed(1)} km · {track.mode.replaceAll("_", " ")}</span><span>{Math.round(progress * 100)}%</span></div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function TrackLegend({ tracks, now }: { tracks: DemoDeliveryTrack[]; now: Date }) {
  return <div className="grid gap-2 md:grid-cols-2">{tracks.map((track) => <div key={track.id} className="flex items-center justify-between rounded-lg border border-white/15 bg-white/5 p-3 text-sm text-text-dark"><span>{track.sourceName} · {track.units} unit(s)</span><Badge>{deliveryStatusAt(track, now).replaceAll("_", " ")}</Badge></div>)}</div>;
}
