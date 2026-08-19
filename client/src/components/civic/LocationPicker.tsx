import { Crosshair, MapPin } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { MapView } from "@/components/Map";

export type CivicLocation = { latitude: number; longitude: number; address: string };

type Props = { value: CivicLocation | null; onChange: (location: CivicLocation) => void };
const defaultLocation = { latitude: 28.6139, longitude: 77.209, address: "New Delhi, Delhi" };

export function LocationPicker({ value, onChange }: Props) {
  const mapRef = useRef<google.maps.Map | null>(null);
  const markerRef = useRef<google.maps.marker.AdvancedMarkerElement | null>(null);
  const [loadingLocation, setLoadingLocation] = useState(false);
  const selected = value ?? defaultLocation;

  function placeMarker(map: google.maps.Map, latitude: number, longitude: number) {
    markerRef.current?.map && (markerRef.current.map = null);
    markerRef.current = new google.maps.marker.AdvancedMarkerElement({ map, position: { lat: latitude, lng: longitude }, title: "Confirmed issue location" });
  }

  async function describeLocation(latitude: number, longitude: number) {
    const fallback = `${latitude.toFixed(6)}, ${longitude.toFixed(6)}`;
    try {
      const geocoder = new google.maps.Geocoder();
      const result = await geocoder.geocode({ location: { lat: latitude, lng: longitude } });
      onChange({ latitude, longitude, address: result.results[0]?.formatted_address ?? fallback });
    } catch { onChange({ latitude, longitude, address: fallback }); }
  }

  function useMyLocation() {
    if (!navigator.geolocation) return;
    setLoadingLocation(true);
    navigator.geolocation.getCurrentPosition(
      async position => {
        const latitude = position.coords.latitude;
        const longitude = position.coords.longitude;
        mapRef.current?.panTo({ lat: latitude, lng: longitude });
        if (mapRef.current) placeMarker(mapRef.current, latitude, longitude);
        await describeLocation(latitude, longitude);
        setLoadingLocation(false);
      },
      () => setLoadingLocation(false),
      { enableHighAccuracy: true, timeout: 10_000 },
    );
  }

  return <section className="space-y-3"><div className="overflow-hidden rounded-xl border border-slate-200 bg-slate-100"><MapView className="h-64 sm:h-80" initialCenter={{ lat: selected.latitude, lng: selected.longitude }} initialZoom={15} onMapReady={map => { mapRef.current = map; placeMarker(map, selected.latitude, selected.longitude); map.addListener("click", async (event: google.maps.MapMouseEvent) => { if (!event.latLng) return; const latitude = event.latLng.lat(); const longitude = event.latLng.lng(); placeMarker(map, latitude, longitude); await describeLocation(latitude, longitude); }); }} /></div><div className="flex flex-col gap-3 rounded-xl border border-emerald-100 bg-emerald-50/70 p-3 sm:flex-row sm:items-center sm:justify-between"><div className="flex min-w-0 items-start gap-2"><MapPin className="mt-0.5 h-4 w-4 shrink-0 text-emerald-700" /><div><p className="text-xs font-bold text-emerald-900">Location confirmed</p><p className="truncate text-sm text-emerald-800">{value?.address || "Tap the map or use your current location to confirm."}</p></div></div><Button type="button" variant="outline" size="sm" className="border-emerald-200 bg-white text-emerald-800 hover:bg-emerald-100" onClick={useMyLocation} disabled={loadingLocation}><Crosshair className="mr-1.5 h-4 w-4" />{loadingLocation ? "Locating…" : "Use my location"}</Button></div><p className="text-xs leading-relaxed text-slate-500">Tap a precise spot on the map to adjust the marker. Please check the pin before submitting your report.</p></section>;
}
