import { useState, useEffect } from "react";
import Plot from "react-plotly.js";
import { motion } from "framer-motion";

// Tipos estrictos
type Experience = {
  country: string;
  food: number | null;
  service: number | null;
  value: number | null;
  atmosphere: number | null;
};
type CuisineRatings = Record<string, number[]>;
type BubbleData = {
  country: string;
  avg_rating: number;
  avg_price_level: number;
  total_restaurants: number;
};

const API_URL = "http://localhost:4000/api";

export default function GeneralCharts() {
  const [active, setActive] = useState<number>(0);

  const [countries, setCountries] = useState<string[]>([]);
  const [selectedCountry, setSelectedCountry] = useState<string>("");

  const [experience, setExperience] = useState<Experience[]>([]);
  const [cuisines, setCuisines] = useState<CuisineRatings>({});
  const [selectedCuisine, setSelectedCuisine] = useState<string>("");

  const [bubbles, setBubbles] = useState<BubbleData[]>([]);

  // Cargar países
  useEffect(() => {
    fetch(`${API_URL}/countries`)
      .then((res) => res.json())
      .then(setCountries)
      .catch(() => setCountries([]));
  }, []);

  // Cargar datos por país para radar y violin plot
  useEffect(() => {
    if (!selectedCountry) return;
    Promise.all([
      fetch(
        `${API_URL}/experience-by-country?country=${encodeURIComponent(
          selectedCountry
        )}`
      ).then((r) => r.json()),
      fetch(
        `${API_URL}/violin-cuisines?country=${encodeURIComponent(
          selectedCountry
        )}`
      ).then((r) => r.json()),
    ]).then(([exp, cuis]) => {
      setExperience(Array.isArray(exp) ? exp : []);
      setCuisines(typeof cuis === "object" ? cuis : {});
      setSelectedCuisine("");
    });
  }, [selectedCountry]);

  // Cargar datos bubble por país (scatter horizontal)
  useEffect(() => {
    fetch(`${API_URL}/countries-avg`)
      .then((res) => res.json())
      .then((data) => {
        const vals = Array.isArray(data) ? data : [];
        const counts = vals.map((d: BubbleData) => d.total_restaurants);
        const mean =
          counts.reduce((acc, v) => acc + v, 0) / (counts.length || 1);
        const std =
          Math.sqrt(
            counts.reduce((acc, v) => acc + Math.pow(v - mean, 2), 0) /
              (counts.length || 1)
          ) || 1;
        const maxAllowed = mean + 2 * std;
        setBubbles(
          vals.filter(
            (d: BubbleData) =>
              d.total_restaurants < maxAllowed &&
              d.avg_rating !== null &&
              !isNaN(d.avg_rating)
          )
        );
      });
  }, []);

  // Selector de cocina (solo principales)
  const cuisineEntries = Object.entries(cuisines)
    .map(
      ([cuisine, vals]) =>
        [cuisine, Array.isArray(vals) ? vals.length : 0] as [string, number]
    )
    .filter(([_, count]) => count >= 10)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 15);

  const cuisineList = cuisineEntries.map(([c]) => c);

  const filteredCuisines =
    selectedCuisine && cuisines[selectedCuisine]
      ? { [selectedCuisine]: cuisines[selectedCuisine] }
      : Object.fromEntries(cuisineEntries.map(([c]) => [c, cuisines[c]]));

  // --- Escalador para las burbujas ---
  const minSize = 12;
  const maxSize = 38;
  const restaurantCounts = bubbles.map((c) => c.total_restaurants);
  const minCount = Math.min(...restaurantCounts, 1);
  const maxCount = Math.max(...restaurantCounts, 1);
  function scaleBubbleSize(count: number) {
    if (maxCount === minCount) return (maxSize + minSize) / 2;
    return (
      minSize +
      ((Math.sqrt(count) - Math.sqrt(minCount)) /
        (Math.sqrt(maxCount) - Math.sqrt(minCount))) *
        (maxSize - minSize)
    );
  }

  // --- Gráficos
  const plots = [
    // 1. Radar plot de experiencia global
    {
      chart: (
        <Plot
          data={experience.map((c) => ({
            type: "scatterpolar" as const,
            r: [
              c.food ?? 0,
              c.service ?? 0,
              c.value ?? 0,
              c.atmosphere ?? 0,
              c.food ?? 0,
            ],
            theta: [
              "Comida",
              "Servicio",
              "Relación valor",
              "Ambiente",
              "Comida",
            ],
            fill: "toself",
            name: c.country,
            opacity: 0.7,
            marker: { color: "#5176a0" },
          }))}
          layout={{
            title: {
              text: `Experiencia global${
                selectedCountry ? `: ${selectedCountry}` : ""
              }`,
              font: { size: 19 },
            },
            polar: {
              radialaxis: {
                visible: true,
                range: [3, 5],
                tickfont: { size: 12 },
              },
            },
            showlegend: false,
            height: 300,
            width: 300,
            margin: { t: 30, l: 12, r: 12, b: 16 },
            paper_bgcolor: "#fff",
            plot_bgcolor: "#fff",
          }}
          config={{ displayModeBar: false }}
          style={{ width: "100%", height: "100%" }}
        />
      ),
    },
    // 2. Violin plot de rating por cocina (más grande)
    {
      chart: (
        <div>
          <div className="mb-3 flex justify-center">
            <select
              className="rounded border px-3 py-1 bg-white shadow-sm font-semibold text-slate-700"
              value={selectedCuisine}
              onChange={(e) => setSelectedCuisine(e.target.value)}
            >
              <option value="">Todas las cocinas</option>
              {cuisineList.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>
          <div style={{ width: "380px", maxWidth: "100%" }}>
            <Plot
              data={Object.entries(filteredCuisines).map(([cuisine, vals]) => ({
                type: "violin" as const,
                y: Array.isArray(vals)
                  ? vals.filter((v): v is number => v != null)
                  : [],
                name: cuisine,
                box: { visible: true },
                line: { color: "#5176a0" },
                meanline: { visible: true },
                opacity: 0.8,
              }))}
              layout={{
                title: {
                  text: `Ratings por cocina${
                    selectedCuisine ? `: ${selectedCuisine}` : ""
                  }`,
                  font: { size: 16 },
                },
                yaxis: {
                  title: "Rating",
                  range: [3, 5],
                  tickfont: { size: 11 },
                  automargin: true,
                },
                height: 280,
                width: 380,
                margin: { t: 28, l: 36, r: 18, b: 38 },
                paper_bgcolor: "#fff",
                plot_bgcolor: "#fff",
              }}
              config={{ displayModeBar: false }}
              style={{ width: "100%", height: "100%" }}
            />
          </div>
        </div>
      ),
    },
    // 3. Bubble chart horizontal de ratings por país (más grande)
    {
      chart: (
        <div style={{ width: "350px", maxWidth: "100%" }}>
          <Plot
            data={[
              {
                type: "scatter",
                mode: "markers+text",
                x: bubbles.map((c) => c.avg_rating),
                y: bubbles.map((c) => c.country),
                marker: {
                  size: bubbles.map((c) =>
                    scaleBubbleSize(c.total_restaurants)
                  ),
                  color: "#fbbf24",
                  opacity: 0.86,
                  line: { color: "#fff", width: 2 },
                },
                text: bubbles.map((c) => `${c.avg_rating?.toFixed(2)}`),
                textposition: "middle right",
                hovertemplate:
                  "<b>%{y}</b><br>Rating promedio: %{x}<br>Restaurantes: %{marker.size:.0f}<extra></extra>",
                orientation: "h",
              },
            ]}
            layout={{
              title: {
                text: "Países con mejor experiencia",
                font: { size: 15 },
              },
              height: 270,
              width: 350,
              margin: { l: 78, r: 15, t: 32, b: 18 },
              xaxis: {
                title: "Rating promedio",
                range: [3.7, 5],
                gridcolor: "#f3f4f6",
                zeroline: false,
                tickfont: { size: 10 },
              },
              yaxis: {
                automargin: true,
                tickfont: { size: 11, color: "#334155" },
                gridcolor: "#f3f4f6",
              },
              showlegend: false,
              paper_bgcolor: "#f9fafb",
              plot_bgcolor: "#f9fafb",
            }}
            config={{ displayModeBar: false }}
            style={{ width: "100%", height: "100%" }}
          />
        </div>
      ),
    },
  ];

  const canPrev = active > 0;
  const canNext = active < plots.length - 1;

  return (
    <div
      className="w-full min-h-screen flex flex-col items-center justify-center py-12"
      style={{
        background: `url('/fondo.jpg') center/cover no-repeat fixed`,
      }}
    >
      <div className="w-full max-w-6xl mx-auto flex flex-row flex-wrap gap-10 py-10 min-h-[500px]">
        {/* Panel de gráficos */}
        <div className="w-[380px] min-w-[250px] max-w-[410px] sticky top-20 h-fit z-20 bg-white/80 rounded-3xl shadow-2xl px-2 py-3 flex flex-col items-center border border-blue-100 backdrop-blur-lg">
          <h2 className="text-xl font-bold mb-3 tracking-tight text-gray-800 text-center">
            Datos destacados
          </h2>
          <div className="relative w-full flex flex-col items-center">
            {/* Botones para cambiar de chart */}
            <div className="flex flex-row gap-4 mb-2 justify-center items-center">
              <button
                onClick={() => canPrev && setActive((a) => Math.max(0, a - 1))}
                disabled={!canPrev}
                className={`px-2 py-1 rounded-full text-lg font-bold border shadow-sm bg-gray-100 hover:bg-blue-200 transition disabled:opacity-40`}
                aria-label="Anterior"
              >
                ◀
              </button>
              <span className="font-semibold text-gray-700">
                {active + 1} / {plots.length}
              </span>
              <button
                onClick={() =>
                  canNext && setActive((a) => Math.min(plots.length - 1, a + 1))
                }
                disabled={!canNext}
                className={`px-2 py-1 rounded-full text-lg font-bold border shadow-sm bg-gray-100 hover:bg-blue-200 transition disabled:opacity-40`}
                aria-label="Siguiente"
              >
                ▶
              </button>
            </div>
            {/* Chart activo */}
            <div className="w-full min-h-[150px] flex justify-center items-center">
              {plots[active].chart}
            </div>
          </div>
        </div>

        {/* Panel derecho de texto */}
        <div className="flex-1 flex flex-col items-center">
          <div className="w-full flex flex-col items-center border bg-white/85 rounded-3xl shadow-xl p-8 max-w-2xl mt-4 backdrop-blur-lg">
            {/* Selector de país aquí */}
            <div className="flex w-full justify-center mb-5">
              <select
                className="rounded-lg border border-gray-300 px-4 py-2 shadow focus:outline-none focus:ring-2 focus:ring-blue-400 font-semibold"
                value={selectedCountry}
                onChange={(e) => setSelectedCountry(e.target.value)}
              >
                <option value="">Selecciona país...</option>
                {countries.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>
            <h2 className="text-2xl font-bold mb-4 text-gray-800 text-center">
              Vive la experiencia gastronómica
            </h2>
            <p className="text-base text-gray-600 leading-relaxed font-medium text-center">
              Explora la diversidad y calidad de los restaurantes más destacados
              de Europa.
              <br />
              Descubre nuevas tendencias culinarias, conoce los destinos
              favoritos y encuentra el lugar perfecto para tu próxima comida.
              <br />
              <br />
              Este dashboard está diseñado para inspirarte, comparar y
              planificar, combinando datos reales y visualizaciones interactivas
              para ayudarte a elegir mejor y vivir una aventura gastronómica sin
              igual.
            </p>
            <div className="flex flex-row gap-2 items-center justify-center mt-7">
              <span className="font-semibold text-md text-slate-700">
                ¡Haz de tu próxima visita una experiencia inolvidable!
              </span>
            </div>
          </div>
          {/* CARD ANIMADA: VISITA EUROPA */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 40 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ duration: 1.2, type: "spring" }}
            className="mt-8 bg-blue-100/70 border border-blue-200 px-8 py-6 rounded-2xl shadow-xl max-w-xl flex flex-col items-center backdrop-blur-md"
          >
            <img
              src="https://media.tenor.com/nUZqoPvdfAoAAAAM/garfield-spaghetti.gif"
              alt="Garfield comiendo spaghetti"
              className="w-40 h-40 rounded-xl mb-4 shadow-lg object-cover"
              style={{
                background: "#fff",
                border: "3px solid #b0c4de",
                objectFit: "cover",
                maxWidth: 160,
                maxHeight: 160,
                minHeight: 100,
              }}
              loading="lazy"
            />
            <motion.h3
              initial={{ scale: 1 }}
              animate={{ scale: [1, 1.04, 0.98, 1] }}
              transition={{
                repeat: Infinity,
                duration: 2.5,
                ease: "easeInOut",
                repeatType: "loop",
              }}
              className="text-3xl font-bold text-blue-700 mb-2"
            >
              ¡Visita Europa!
            </motion.h3>
            <p className="text-blue-900 text-md font-medium text-center">
              Descubre las mejores ciudades para disfrutar la gastronomía, vive
              momentos únicos y déjate sorprender por la cultura, la comida y el
              arte en cada rincón del continente.
            </p>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
