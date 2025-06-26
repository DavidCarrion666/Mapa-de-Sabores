import { useRef, useEffect, useState } from "react";
import Globe, { type GlobeMethods } from "react-globe.gl";
import { FaGlobeEurope, FaStore } from "react-icons/fa";
import Plot from "react-plotly.js";

const COLORS = {
  red: "#e53935",
  blue: "#2563eb",
  green: "#22c55e",
  orange: "#fb923c",
  yellow: "#fde047",
};

const countryNameMap: Record<string, string | string[]> = {
  "United Kingdom": ["England", "Scotland", "Wales", "Northern Ireland"],
  Netherlands: ["The Netherlands", "Netherlands"],
  Ireland: ["Ireland", "Northern Ireland"],
  "United States": ["United States", "USA", "United States of America"],
};

const EUROPEAN_COUNTRIES = [
  "Albania",
  "Andorra",
  "Armenia",
  "Austria",
  "Azerbaijan",
  "Belarus",
  "Belgium",
  "Bosnia and Herzegovina",
  "Bulgaria",
  "Croatia",
  "Cyprus",
  "Czechia",
  "Denmark",
  "Estonia",
  "Finland",
  "France",
  "Georgia",
  "Germany",
  "Greece",
  "Hungary",
  "Iceland",
  "Ireland",
  "Italy",
  "Kazakhstan",
  "Kosovo",
  "Latvia",
  "Liechtenstein",
  "Lithuania",
  "Luxembourg",
  "Malta",
  "Moldova",
  "Monaco",
  "Montenegro",
  "Netherlands",
  "North Macedonia",
  "Norway",
  "Poland",
  "Portugal",
  "Romania",
  "Russia",
  "San Marino",
  "Serbia",
  "Slovakia",
  "Slovenia",
  "Spain",
  "Sweden",
  "Switzerland",
  "Turkey",
  "Ukraine",
  "United Kingdom",
  "Vatican City",
];

type CountryProperties = {
  ADMIN?: string;
  name?: string;
  [key: string]: string | number | undefined;
};
type CountryGeometry = {
  type: "Polygon" | "MultiPolygon";
  coordinates: number[][][] | number[][][][];
};
type CountryFeature = {
  type: "Feature";
  properties: CountryProperties;
  geometry: CountryGeometry;
};
type CountryStats = {
  country: string;
  total_restaurants: string | number;
  vegan: string | number;
  gluten_free: string | number;
};

interface Globe3DProps {
  onCountrySelect: (country: string) => void;
}

export default function Globe3D({ onCountrySelect }: Globe3DProps) {
  const globeRef = useRef<GlobeMethods | undefined>(undefined);
  const [countries, setCountries] = useState<CountryFeature[]>([]);
  const [selectedCountry, setSelectedCountry] = useState<string | null>(null);
  const [restaurantCount, setRestaurantCount] = useState<number | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Stats para el gráfico de barras
  const [countryStats, setCountryStats] = useState<CountryStats | null>(null);
  const [statsLoading, setStatsLoading] = useState(false);

  // PieChart de precios
  const [priceStats, setPriceStats] = useState<null | {
    cheap: string;
    medium: string;
    luxury: string;
  }>(null);

  // TOP COUNTRIES
  const [topCountries, setTopCountries] = useState<
    { country: string; count: number }[]
  >([]);

  // Fetch top countries
  useEffect(() => {
    fetch("http://localhost:4000/api/top-countries")
      .then((res) => res.json())
      .then((data) => setTopCountries(data))
      .catch(() => setTopCountries([]));
  }, []);

  // PieChart precios
  useEffect(() => {
    if (!selectedCountry) {
      setPriceStats(null);
      return;
    }
    const mapped = countryNameMap[selectedCountry] || selectedCountry;
    const queryParam = Array.isArray(mapped) ? mapped.join(",") : mapped;
    fetch(
      `http://localhost:4000/api/country-prices?country=${encodeURIComponent(
        queryParam
      )}`
    )
      .then((res) => res.json())
      .then((data) => setPriceStats(data))
      .catch(() => setPriceStats(null));
  }, [selectedCountry]);

  // Auto-rotación globo
  useEffect(() => {
    if (globeRef.current) {
      const controls = globeRef.current.controls();
      if (controls) {
        controls.autoRotate = true;
        controls.autoRotateSpeed = 0.85;
      }
    }
  }, [countries]);

  // Cargar países
  useEffect(() => {
    fetch("/custom.geojson")
      .then((res) => res.json())
      .then((data) => {
        if (data && data.features && Array.isArray(data.features)) {
          setCountries(data.features);
        }
      })
      .catch((err) => {
        console.error("Error al cargar custom.geoJson:", err);
      });
  }, []);

  // Consulta total restaurantes
  useEffect(() => {
    if (!selectedCountry) {
      setRestaurantCount(null);
      setError(null);
      return;
    }
    setLoading(true);
    setError(null);

    const mapped = countryNameMap[selectedCountry] || selectedCountry;
    const queryParam = Array.isArray(mapped) ? mapped.join(",") : mapped;

    fetch(
      `http://localhost:4000/api/restaurant-count?country=${encodeURIComponent(
        queryParam
      )}`
    )
      .then((res) => {
        if (!res.ok) throw new Error("No se pudo obtener la información");
        return res.json();
      })
      .then((data) => {
        setRestaurantCount(Number(data.count));
      })
      .catch(() => {
        setError("Error al consultar el backend");
        setRestaurantCount(null);
      })
      .finally(() => setLoading(false));
  }, [selectedCountry]);

  // Consulta stats para el gráfico de barras
  useEffect(() => {
    if (!selectedCountry) {
      setCountryStats(null);
      return;
    }
    setStatsLoading(true);
    const mapped = countryNameMap[selectedCountry] || selectedCountry;
    const queryParam = Array.isArray(mapped) ? mapped.join(",") : mapped;
    fetch(
      `http://localhost:4000/api/country-stats?country=${encodeURIComponent(
        queryParam
      )}`
    )
      .then((res) => res.json())
      .then((data) => setCountryStats(data))
      .catch(() => setCountryStats(null))
      .finally(() => setStatsLoading(false));
  }, [selectedCountry]);

  return (
    <div
      className="relative min-h-screen w-full overflow-x-hidden"
      style={{ background: "#f6f6f6" }}
    >
      {/* FONDO GRILLA */}
      <div
        className="absolute inset-0 z-0 pointer-events-none"
        style={{
          backgroundImage: "url('/fondo.jpg')",
          backgroundSize: "cover",
          backgroundPosition: "center",
          backgroundRepeat: "no-repeat",
          filter: "grayscale(1)",
        }}
      />

      {/* HEADER */}
      <div className="absolute top-0 left-0 w-full flex flex-row justify-between items-center px-14 pt-8 z-10">
        <div className="flex flex-col">
          <span
            className="font-red text-4xl md:text-5xl"
            style={{
              color: COLORS.red,
              lineHeight: "1.04",
              letterSpacing: "-2px",
            }}
          >
            Mundo de Sabores
          </span>
          <span
            className="font-semibold mt-2 text-lg"
            style={{ color: COLORS.blue }}
          >
            Dashboard Interactivo de Restaurantes en Europa
          </span>
        </div>
        <div className="flex items-center gap-4">
          <div
            className="rounded-xl px-5 py-2 text-xs font-bold shadow border"
            style={{
              color: COLORS.green,
              letterSpacing: "1.2px",
              background: "#fff",
              borderColor: "#ddd",
            }}
          >
            David Carrión y Pablo Costa
          </div>
        </div>
      </div>

      <div className="flex flex-row h-screen w-full items-stretch pt-36 relative z-10">
        {/* PANEL IZQUIERDO (Widgets) */}
        <div className="flex flex-col justify-start gap-8 w-[390px] min-w-[340px] max-w-[410px] pl-14 pr-4 pt-2">
          {/* SELECTOR de país */}
          <div className="flex flex-col mb-3">
            <label
              className="text-lg font-semibold mb-2"
              style={{ color: COLORS.green }}
            >
              Selecciona un país:
            </label>
            <select
              className="w-full rounded-xl px-3 py-2 border-2 outline-none font-bold transition bg-white text-lg"
              style={{
                borderColor: COLORS.orange,
                color: COLORS.blue,
                boxShadow: `0 0 0 2px #ccc`,
                background: "#fafafa",
              }}
              value={selectedCountry || ""}
              onChange={(e) => {
                setSelectedCountry(e.target.value);
                onCountrySelect(e.target.value);
              }}
            >
              <option value="" disabled>
                Elige un país...
              </option>
              {EUROPEAN_COUNTRIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>

          {/* CARD */}
          <div
            className="relative rounded-3xl w-full p-8 shadow"
            style={{
              background: "#f9f9f9",
              border: `1.5px solid #bbb`,
              boxShadow: `0 4px 16px 0 #e0e0e0`,
              minHeight: 200,
              overflow: "visible",
            }}
          >
            {/* Badge arriba */}
            <div className="absolute left-1/2 -top-10 -translate-x-1/2 flex items-center justify-center"></div>
            {selectedCountry ? (
              <div className="flex flex-col items-center gap-2 mt-3">
                <h2
                  className="text-2xl font-extrabold mb-1 tracking-tight"
                  style={{
                    color: COLORS.blue,
                    letterSpacing: "-1px",
                  }}
                >
                  {selectedCountry}
                </h2>
                <div className="flex flex-col items-center gap-0.5 mt-1 w-full">
                  <span
                    className="inline-flex items-center px-5 py-2 rounded-full font-bold text-xl"
                    style={{
                      background: "#eee",
                      color: COLORS.green,
                      border: `1.5px solid #bbb`,
                      minWidth: 180,
                      justifyContent: "center",
                      boxShadow: `0 4px 8px #ededed`,
                    }}
                  >
                    <FaStore
                      className="mr-2"
                      size={24}
                      style={{ color: COLORS.blue }}
                    />
                    <span
                      className="font-extrabold text-2xl mr-2"
                      style={{ color: COLORS.red }}
                    >
                      {loading ? (
                        <span
                          className="animate-pulse"
                          style={{ color: COLORS.red }}
                        >
                          Cargando...
                        </span>
                      ) : error ? (
                        <span style={{ color: COLORS.red }}>Error</span>
                      ) : (
                        restaurantCount ?? "--"
                      )}
                    </span>
                    <span
                      className="text-base font-bold"
                      style={{ color: "#222" }}
                    >
                      restaurantes
                    </span>
                  </span>
                  <span
                    className="mt-2 text-sm italic"
                    style={{
                      color: restaurantCount === 0 ? "#555" : "#333",
                    }}
                  >
                    {restaurantCount === 0
                      ? "No hay restaurantes registrados."
                      : "Número total registrados en nuestra base de datos."}
                  </span>
                </div>
                {/* PIE CHART DE PRECIOS */}
                {priceStats && (
                  <div className="w-full flex flex-col items-center mt-8">
                    <span
                      className="mb-0 text-base font-semibold"
                      style={{ color: "#555" }}
                    >
                      Distribución de precios
                    </span>
                    <Plot
                      data={[
                        {
                          type: "pie",
                          labels: [
                            "Barato (€)",
                            "Medio (€€-€€€)",
                            "Lujo (€€€€)",
                          ],
                          values: [
                            Number(priceStats.cheap) || 0,
                            Number(priceStats.medium) || 0,
                            Number(priceStats.luxury) || 0,
                          ],
                          marker: {
                            colors: [COLORS.blue, COLORS.green, COLORS.orange],
                          },
                          textinfo: "label+percent",
                          hole: 0.45,
                        },
                      ]}
                      layout={{
                        height: 170,
                        width: 240,
                        margin: { t: 55, l: 10, r: 10, b: 10 },
                        showlegend: true,
                        legend: {
                          orientation: "h",
                          x: 0.5,
                          y: 3.11,
                          xanchor: "center",
                          font: { size: 12 },
                        },
                        paper_bgcolor: "rgba(0,0,0,0)",
                        font: { color: "#444" },
                      }}
                      config={{ displayModeBar: false }}
                    />
                  </div>
                )}
              </div>
            ) : (
              <div
                className="flex flex-col items-center justify-center h-full"
                style={{ minHeight: 120 }}
              >
                <span
                  className="font-bold mb-2 flex items-center gap-2"
                  style={{ color: COLORS.red, fontSize: "1.35rem" }}
                >
                  <FaGlobeEurope style={{ color: COLORS.blue }} size={26} />
                  Selecciona un país
                </span>
                <span
                  className="text-base italic text-center"
                  style={{ color: "#555" }}
                >
                  Haz click en el globo o usa el buscador para descubrir la
                  cantidad de restaurantes de cada país europeo.
                </span>
              </div>
            )}
          </div>
        </div>

        {/* GLOBO 3D CENTRAL */}
        <div className="flex flex-1 items-center justify-center">
          <div
            className="relative flex items-center justify-center w-full h-full"
            style={{
              minWidth: 340,
              minHeight: 340,
              width: "100%",
              height: "100%",
            }}
          >
            <Globe
              ref={globeRef}
              width={600}
              height={600}
              backgroundColor="rgba(0,0,0,0)"
              globeImageUrl="//unpkg.com/three-globe/example/img/earth-blue-marble.jpg"
              polygonsData={countries}
              polygonCapColor={(feat: object) => {
                const f = feat as CountryFeature;
                const countryName =
                  f.properties.ADMIN || f.properties.name || "";
                return selectedCountry === countryName
                  ? "rgba(220, 38, 38, 0.75)"
                  : "rgba(59, 130, 246, 0.4)";
              }}
              polygonSideColor={() => "rgba(0,0,0,0)"}
              polygonStrokeColor={() => "#bbb"}
              polygonLabel={(feat: object) => {
                const f = feat as CountryFeature;
                return f.properties.ADMIN || f.properties.name || "";
              }}
              onPolygonClick={(feat: object) => {
                const f = feat as CountryFeature;
                const country =
                  f.properties.ADMIN || f.properties.name || "Sin nombre";
                setSelectedCountry(country);
                onCountrySelect(country);
              }}
            />
          </div>
        </div>

        {/* PANEL DERECHO (Stats, charts, etc) */}
        <div className="flex flex-col gap-8 w-[370px] min-w-[290px] max-w-[430px] pr-14 pl-4 pt-2">
          {/* Widget ranking */}
          <div
            className="rounded-3xl p-7 shadow"
            style={{
              background: "#f9f9f9",
              border: `1.5px solid #bbb`,
              minHeight: 130,
              boxShadow: `0 4px 8px #ededed`,
            }}
          >
            <span
              className="text-xl font-bold mb-2 block"
              style={{ color: "#222" }}
            >
              Top países con más restaurantes
            </span>
            <table
              style={{
                width: "100%",
                borderCollapse: "collapse",
                marginTop: 8,
              }}
            >
              <thead>
                <tr>
                  <th
                    style={{
                      textAlign: "left",
                      padding: "8px 4px",
                      borderBottom: "1px solid #bbb",
                    }}
                  >
                    País
                  </th>
                  <th
                    style={{
                      textAlign: "right",
                      padding: "8px 4px",
                      borderBottom: "1px solid #bbb",
                    }}
                  >
                    Restaurantes
                  </th>
                </tr>
              </thead>
              <tbody>
                {topCountries.length === 0 ? (
                  <tr>
                    <td
                      colSpan={2}
                      style={{
                        padding: "8px",
                        textAlign: "center",
                        color: "#999",
                      }}
                    >
                      Sin datos
                    </td>
                  </tr>
                ) : (
                  topCountries.map((item) => (
                    <tr key={item.country}>
                      <td style={{ padding: "6px 4px" }}>{item.country}</td>
                      <td style={{ textAlign: "right", padding: "6px 4px" }}>
                        {Number(item.count).toLocaleString()}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          {/* Plotly: Solo cuando hay país seleccionado */}
          {selectedCountry && countryStats && (
            <div
              className="rounded-3xl p-7 shadow mt-2"
              style={{
                background: "#f9f9f9",
                border: `1.5px solid #bbb`,
                minHeight: 260,
                boxShadow: `0 4px 8px #ededed`,
              }}
            >
              <span
                className="text-xl font-bold mb-2 block"
                style={{ color: "#222" }}
              >
                Estadísticas de "{selectedCountry}"
              </span>
              {statsLoading ? (
                <div className="text-center text-gray-500">
                  Cargando gráfico...
                </div>
              ) : (
                <Plot
                  data={[
                    {
                      x: ["Vegano", "Gluten Free"],
                      y: [
                        Number(countryStats.vegan ?? 0),
                        Number(countryStats.gluten_free ?? 0),
                      ],
                      type: "bar",
                      marker: {
                        color: [COLORS.green, COLORS.orange],
                      },
                    },
                  ]}
                  layout={{
                    width: 250,
                    height: 180,
                    margin: { t: 40, l: 40, r: 20, b: 40 },
                    yaxis: { title: "Cantidad" },
                    xaxis: { title: "" },
                    plot_bgcolor: "#f9f9f9",
                    paper_bgcolor: "#f9f9f9",
                    font: { color: "#222" },
                    showlegend: false,
                    title: { text: "" },
                  }}
                  config={{ displayModeBar: false }}
                />
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
