import { useState, useEffect } from "react";
import {
  MapContainer,
  TileLayer,
  LayersControl,
  LayerGroup,
  CircleMarker,
  useMapEvent,
} from "react-leaflet";
import "leaflet/dist/leaflet.css";
import { HeatmapLayer } from "./HeatmapLayer";

const COUNTRY_CENTERS: Record<string, [number, number]> = {
  Spain: [40.4, -3.7],
  France: [46.6, 2.3],
  Italy: [42.9, 12.5],
  Portugal: [39.5, -8],
};

const COUNTRY_OPTIONS = [
  { value: "Spain", label: "España" },
  { value: "France", label: "Francia" },
  { value: "Italy", label: "Italia" },
  { value: "Portugal", label: "Portugal" },
];

const HEATMAP_OPTIONS = [
  { value: "restaurants", label: "Mapa de calor de restaurantes" },
  { value: "prices", label: "Mapa de calor de precios" },
  { value: "top", label: "Restaurantes más visitados" },
];

const PRICE_COLORS: Record<string, string> = {
  "€": "#34d399",
  "€€-€€€": "#f59e42",
  "€€€€": "#ef4444",
};

const PRICE_TYPES = [
  { value: "", label: "Todos los precios" },
  { value: "€", label: "Solo barato (€)" },
  { value: "€€-€€€", label: "Solo medio (€€-€€€)" },
  { value: "€€€€", label: "Solo lujo (€€€€)" },
];

const RANK_COLORS = [
  "#22c55e", // verde (puesto 1)
  "#f97316", // naranja (puesto 2)
  "#ef4444", // rojo (puesto 3)
];

interface Location {
  lat: number | string;
  lng: number | string;
  name: string;
  price?: number;
  price_level?: string;
  vegan?: boolean;
}
interface TopRestaurant {
  name: string;
  city: string;
  avg_rating: number;
  total_reviews_count: number;
  lat: number | string;
  lng: number | string;
  restaurant_link?: string;
}

export default function CountryMap() {
  const [selectedCountry, setSelectedCountry] = useState<string>("");
  const [selectedHeatmap, setSelectedHeatmap] = useState<string>("");
  const [locations, setLocations] = useState<Location[]>([]);
  const [showHeatmap, setShowHeatmap] = useState(true);
  const [loading, setLoading] = useState(false);
  const [priceType, setPriceType] = useState<string>("");
  const [topRestaurants, setTopRestaurants] = useState<TopRestaurant[]>([]);
  const [showTopCards, setShowTopCards] = useState(true);

  function MapClickCloser() {
    useMapEvent("click", () => {});
    return null;
  }

  const center: [number, number] =
    selectedCountry && COUNTRY_CENTERS[selectedCountry]
      ? COUNTRY_CENTERS[selectedCountry]
      : [48, 8];

  useEffect(() => {
    if (selectedHeatmap === "prices") setShowHeatmap(false);
    if (selectedHeatmap === "restaurants") setShowHeatmap(true);
    setPriceType("");
  }, [selectedHeatmap]);

  useEffect(() => {
    setShowTopCards(true); // Mostrar cards cada vez que cambias país o tipo de mapa
    if (!selectedCountry || !selectedHeatmap) {
      setLocations([]);
      setTopRestaurants([]);
      return;
    }
    setLoading(true);

    if (selectedHeatmap === "top") {
      fetch(
        `http://localhost:4000/api/top-restaurants?country=${encodeURIComponent(
          selectedCountry
        )}`
      )
        .then((res) => res.json())
        .then((data) => {
          setTopRestaurants(data);
          setLocations([]);
        })
        .catch((err) => {
          setTopRestaurants([]);
          setLocations([]);
          console.error("Error fetch", err);
        })
        .finally(() => setLoading(false));
    } else {
      setTopRestaurants([]);
      let endpoint = "";
      if (selectedHeatmap === "restaurants") {
        endpoint = `http://localhost:4000/api/restaurants?country=${encodeURIComponent(
          selectedCountry
        )}`;
      } else if (selectedHeatmap === "prices") {
        endpoint = `http://localhost:4000/api/prices?country=${encodeURIComponent(
          selectedCountry
        )}`;
      }
      fetch(endpoint)
        .then((res) => res.json())
        .then((data) => {
          setLocations(data);
        })
        .catch((err) => {
          console.error("Error fetch", err);
          setLocations([]);
        })
        .finally(() => setLoading(false));
    }
  }, [selectedCountry, selectedHeatmap]);

  // Prepara puntos para el heatmap
  let points: [number, number, number?][] = [];
  if (selectedHeatmap === "restaurants") {
    points = locations
      .filter(
        (loc) =>
          loc.lat !== undefined &&
          loc.lng !== undefined &&
          !isNaN(Number(loc.lat)) &&
          !isNaN(Number(loc.lng))
      )
      .map((loc) => [Number(loc.lat), Number(loc.lng), 1]);
  }

  const PriceLegend = () => (
    <div className="mt-6">
      <h3 className="font-bold mb-2">Leyenda de precios</h3>
      <div className="flex items-center gap-3 flex-wrap">
        <span
          className="inline-block w-4 h-4 rounded-full"
          style={{ background: "#34d399" }}
        ></span>
        <span>Barato (€)</span>
        <span
          className="inline-block w-4 h-4 rounded-full"
          style={{ background: "#f59e42" }}
        ></span>
        <span>Medio (€€-€€€)</span>
        <span
          className="inline-block w-4 h-4 rounded-full"
          style={{ background: "#ef4444" }}
        ></span>
        <span>Lujo (€€€€)</span>
      </div>
    </div>
  );

  // Card flotante para el top restaurante (ahora admite color por ranking)
  const TopRestCard = ({
    rest,
    index,
    onClose,
    showClose,
  }: {
    rest: TopRestaurant;
    index: number;
    onClose?: () => void;
    showClose?: boolean;
  }) => (
    <div
      className="fixed z-[9999] bg-white rounded-2xl shadow-2xl p-6 max-w-xs border-2"
      style={{
        minWidth: 280,
        animation: "fadein .3s",
        right: 32,
        bottom: 32 + 150 * index, // Más espacio entre cards
        borderColor: RANK_COLORS[index] ?? "#a1a1aa",
      }}
    >
      <div
        className="mb-3 text-lg font-bold flex items-center gap-3"
        style={{ color: RANK_COLORS[index] ?? "#171717" }}
      >
        {`#${index + 1} ${rest.name}`}
        {showClose && (
          <button
            className="ml-auto text-gray-400 hover:text-gray-600 text-lg"
            style={{ lineHeight: 1 }}
            onClick={onClose}
            aria-label="Cerrar cards"
            title="Cerrar cards"
          >
            ×
          </button>
        )}
      </div>
      <div className="mb-2 text-gray-700 text-sm">{rest.city}</div>
      <div className="flex items-center gap-2 mb-2">
        <span className="text-yellow-400 font-bold text-xl">★</span>
        <span className="font-bold">{rest.avg_rating ?? "--"}</span>
        <span className="text-gray-500 text-sm ml-2">
          ({rest.total_reviews_count ?? 0} reseñas)
        </span>
      </div>
      {rest.restaurant_link && (
        <a
          href={rest.restaurant_link}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-block text-blue-600 hover:underline text-sm mt-2"
        >
          Ver en TripAdvisor
        </a>
      )}
    </div>
  );

  return (
    <div className="flex flex-row gap-8 w-full max-w-6xl mx-auto mt-12 mb-8">
      {/* Panel izquierdo */}
      <div className="flex flex-col w-80 bg-white/90 shadow-xl rounded-2xl p-6 h-fit">
        <h2 className="text-xl font-bold mb-6">Mapa de calor por país</h2>
        {/* Select país */}
        <label className="mb-2 font-semibold" htmlFor="countryType">
          Selecciona país:
        </label>
        <select
          id="countryType"
          value={selectedCountry}
          onChange={(e) => {
            setSelectedCountry(e.target.value);
            setSelectedHeatmap("");
          }}
          className="rounded-lg border border-gray-300 px-4 py-2 mb-6 focus:outline-none focus:ring-2 focus:ring-blue-400"
        >
          <option value="">Selecciona un país...</option>
          {COUNTRY_OPTIONS.map((opt) => (
            <option value={opt.value} key={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
        {/* Select tipo de mapa */}
        <label className="mb-2 font-semibold" htmlFor="heatmapType">
          Tipo de mapa:
        </label>
        <select
          id="heatmapType"
          value={selectedHeatmap}
          onChange={(e) => {
            setSelectedHeatmap(e.target.value);
          }}
          className="rounded-lg border border-gray-300 px-4 py-2 mb-6 focus:outline-none focus:ring-2 focus:ring-blue-400"
          disabled={!selectedCountry}
        >
          <option value="">Selecciona tipo de mapa...</option>
          {HEATMAP_OPTIONS.map((opt) => (
            <option value={opt.value} key={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
        {/* Filtro de precios */}
        {selectedHeatmap === "prices" && (
          <div className="mb-4">
            <label className="mb-2 font-semibold" htmlFor="priceType">
              Filtrar tipo de precio:
            </label>
            <select
              id="priceType"
              value={priceType}
              onChange={(e) => setPriceType(e.target.value)}
              className="rounded-lg border border-gray-300 px-4 py-2 mt-1 w-full focus:outline-none focus:ring-2 focus:ring-blue-400"
            >
              {PRICE_TYPES.map((opt) => (
                <option value={opt.value} key={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>
        )}
        {selectedHeatmap !== "prices" && selectedHeatmap !== "top" && (
          <button
            className={`px-4 py-2 rounded font-bold shadow ${
              showHeatmap ? "bg-blue-600 text-white" : "bg-gray-200"
            }`}
            onClick={() => setShowHeatmap((v) => !v)}
            disabled={!selectedHeatmap}
          >
            {showHeatmap ? "Mostrar marcadores" : "Mostrar mapa de calor"}
          </button>
        )}
        {loading && (
          <div className="text-gray-500 text-center my-2">
            Cargando datos...
          </div>
        )}
        {selectedHeatmap === "prices" && !showHeatmap && <PriceLegend />}
      </div>
      {/* Panel derecho (mapa) */}
      <div className="flex-1 flex flex-col bg-white/90 shadow-xl rounded-2xl p-6">
        <h2 className="text-2xl font-bold mb-5">
          {selectedCountry && selectedHeatmap
            ? `Mapa de calor: ${
                COUNTRY_OPTIONS.find((opt) => opt.value === selectedCountry)
                  ?.label ?? ""
              }`
            : "Selecciona país y tipo de mapa"}
        </h2>
        {!loading &&
          locations.length === 0 &&
          topRestaurants.length === 0 &&
          selectedCountry &&
          selectedHeatmap && (
            <div className="text-gray-500 text-center my-4">
              No hay restaurantes registrados en {selectedCountry}.
            </div>
          )}
        {selectedCountry &&
          selectedHeatmap &&
          (locations.length > 0 || topRestaurants.length > 0) && (
            <div
              style={{
                height: 430,
                width: "100%",
                borderRadius: 24,
                overflow: "hidden",
                boxShadow: "0 4px 18px #ececec",
                position: "relative",
              }}
            >
              <MapContainer
                center={center}
                zoom={6}
                scrollWheelZoom={true}
                style={{ height: "100%", width: "100%" }}
              >
                <MapClickCloser />
                <LayersControl position="topright">
                  <LayersControl.BaseLayer checked name="Mapa normal">
                    <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                  </LayersControl.BaseLayer>
                  <LayersControl.BaseLayer name="Topográfico">
                    <TileLayer url="https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png" />
                  </LayersControl.BaseLayer>
                  <LayersControl.BaseLayer name="Satélite (ESRI)">
                    <TileLayer url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}" />
                  </LayersControl.BaseLayer>
                </LayersControl>
                {/* Círculos filtrados para precios */}
                {selectedHeatmap === "prices" && !showHeatmap && (
                  <LayerGroup>
                    {locations
                      .filter(
                        (loc) =>
                          loc.lat !== undefined &&
                          loc.lng !== undefined &&
                          loc.price_level &&
                          !isNaN(Number(loc.lat)) &&
                          !isNaN(Number(loc.lng)) &&
                          PRICE_COLORS[loc.price_level!] &&
                          (priceType === "" || loc.price_level === priceType)
                      )
                      .map((loc, i) => (
                        <CircleMarker
                          key={i}
                          center={[Number(loc.lat), Number(loc.lng)]}
                          radius={7}
                          pathOptions={{
                            color: "transparent",
                            fillColor: PRICE_COLORS[loc.price_level!],
                            fillOpacity: 0.4,
                            weight: 0,
                          }}
                        />
                      ))}
                  </LayerGroup>
                )}
                {/* Heatmap para restaurantes */}
                {selectedHeatmap === "restaurants" && showHeatmap && (
                  <HeatmapLayer points={points} />
                )}
                {/* Marcadores normales para restaurantes */}
                {selectedHeatmap === "restaurants" && !showHeatmap && (
                  <LayerGroup>
                    {locations
                      .filter(
                        (loc) =>
                          loc.lat !== undefined &&
                          loc.lng !== undefined &&
                          !isNaN(Number(loc.lat)) &&
                          !isNaN(Number(loc.lng))
                      )
                      .map((loc, i) => (
                        <CircleMarker
                          key={i}
                          center={[Number(loc.lat), Number(loc.lng)]}
                          radius={4}
                          pathOptions={{
                            color: "#3b82f6",
                            fillColor: "#3b82f6",
                            fillOpacity: 0.6,
                            weight: 0,
                          }}
                        />
                      ))}
                  </LayerGroup>
                )}
                {/* Top restaurantes: 3 más visitados, con colores distintos */}
                {selectedHeatmap === "top" && showTopCards && (
                  <LayerGroup>
                    {topRestaurants
                      .slice(0, 3)
                      .filter(
                        (rest) =>
                          rest.lat !== undefined &&
                          rest.lng !== undefined &&
                          !isNaN(Number(rest.lat)) &&
                          !isNaN(Number(rest.lng))
                      )
                      .map((rest, i) => (
                        <CircleMarker
                          key={i}
                          center={[Number(rest.lat), Number(rest.lng)]}
                          radius={13}
                          pathOptions={{
                            color: RANK_COLORS[i] ?? "#a1a1aa",
                            fillColor: RANK_COLORS[i] ?? "#a1a1aa",
                            fillOpacity: 0.8,
                            weight: 2,
                          }}
                        />
                      ))}
                  </LayerGroup>
                )}
              </MapContainer>
              {/* Las tres cards, cada una con su color y posición */}
              {selectedHeatmap === "top" && showTopCards && (
                <div
                  className="fixed z-[9999] right-8 bottom-8 flex flex-col items-end gap-4"
                  style={{
                    minWidth: 320,
                    maxWidth: 380,
                    width: 340,
                  }}
                >
                  {topRestaurants.slice(0, 3).map((rest, i) => (
                    <div
                      key={i}
                      style={{
                        width: "100%",
                      }}
                    >
                      <TopRestCard
                        rest={rest}
                        index={i}
                        showClose={i === 0}
                        onClose={() => setShowTopCards(false)}
                      />
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
      </div>
    </div>
  );
}
