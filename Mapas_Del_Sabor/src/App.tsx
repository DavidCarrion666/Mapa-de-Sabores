import { useState } from "react";
import Globe from "./components/globe";
import CountryMap from "./components/CountryMap";
import GeneralCharts from "./components/GeneralCharts";

export default function App() {
  const [selectedCountry, setSelectedCountry] = useState<string>("Spain");

  return (
    <div className="w-full flex flex-col items-center">
      {/* Sección del globo */}
      <Globe onCountrySelect={setSelectedCountry} />

      {/* Sección del mapa */}
      <CountryMap />

      {/* Nueva sección de gráficos generales, completamente independiente */}
      <GeneralCharts />
    </div>
  );
}
