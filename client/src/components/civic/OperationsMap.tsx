import { useCallback, useEffect, useRef } from "react";
import { MapView } from "@/components/Map";

type MapPoint = { id: number; publicId: string; title: string; status: string; priority: string; latitude: number; longitude: number };

function clusterPoints(points: MapPoint[]) {
  const groups = new Map<string, MapPoint[]>();
  points.forEach(point => { const key = `${Math.round(point.latitude * 100) / 100}:${Math.round(point.longitude * 100) / 100}`; groups.set(key, [...(groups.get(key) ?? []), point]); });
  return Array.from(groups.values()).map(group => ({ point: group[0]!, count: group.length }));
}

export function OperationsMap({ points }: { points: MapPoint[] }) {
  const mapRef = useRef<google.maps.Map | null>(null);
  const markers = useRef<google.maps.marker.AdvancedMarkerElement[]>([]);
  const renderMarkers = useCallback(() => {
    if (!mapRef.current || !window.google) return;
    markers.current.forEach(marker => marker.map = null);
    markers.current = clusterPoints(points).map(({ point, count }) => {
      const pin = document.createElement("div");
      pin.className = `grid h-9 min-w-9 place-items-center rounded-full border-2 border-white px-2 text-xs font-black text-white shadow-lg ${point.priority === "CRITICAL" || point.priority === "HIGH" ? "bg-rose-600" : "bg-emerald-700"}`;
      pin.textContent = String(count);
      return new google.maps.marker.AdvancedMarkerElement({ map: mapRef.current, position: { lat: point.latitude, lng: point.longitude }, content: pin, title: count > 1 ? `${count} reports near this location` : `${point.publicId}: ${point.title}` });
    });
    if (points.length) mapRef.current.setCenter({ lat: points[0]!.latitude, lng: points[0]!.longitude });
  }, [points]);
  useEffect(() => { renderMarkers(); }, [renderMarkers]);
  return <MapView className="h-[330px] overflow-hidden rounded-2xl" initialCenter={points.length ? { lat: points[0]!.latitude, lng: points[0]!.longitude } : { lat: 20.5937, lng: 78.9629 }} initialZoom={points.length > 1 ? 12 : 5} onMapReady={map => { mapRef.current = map; renderMarkers(); }} />;
}
