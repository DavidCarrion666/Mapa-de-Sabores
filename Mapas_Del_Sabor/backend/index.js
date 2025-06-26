require("dotenv").config();
const express = require("express");
const cors = require("cors");
const { Pool } = require("pg");

const app = express();
app.use(cors());

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }, // Requerido por Neon
});

// Ruta de prueba
app.get("/", (req, res) => {
  res.send("API de restaurantes activa 🚀");
});

// Endpoint: cuenta de restaurantes por país
app.get("/api/restaurant-count", async (req, res) => {
  let { country } = req.query;
  if (!country) return res.status(400).json({ error: "Country is required" });

  // Si country contiene comas, es un array de países
  let countries = Array.isArray(country)
    ? country
    : String(country).split(",").map(s => s.trim());

  try {
    const result = await pool.query(
      `SELECT COUNT(*) FROM restaurants WHERE country = ANY($1::text[])`,
      [countries]
    );
    res.json({ country: countries, count: result.rows[0].count });
  } catch (err) {
    res.status(500).json({ error: "Error en la consulta", detail: err.message });
  }
});


// Endpoint: top 3 cafeterías por país
app.get("/api/top-cafes", async (req, res) => {
  const { country } = req.query;
  if (!country) return res.status(400).json({ error: "Country is required" });

  try {
    const result = await pool.query(
      `SELECT restaurant_name, city, avg_rating, total_reviews_count
       FROM restaurants
       WHERE country = $1 AND (
         LOWER(cuisines) LIKE '%cafe%' OR
         LOWER(top_tags) LIKE '%cafe%' OR
         LOWER(restaurant_name) LIKE '%cafe%'
       )
       ORDER BY avg_rating DESC NULLS LAST, total_reviews_count DESC NULLS LAST
       LIMIT 3`,
      [country]
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: "Error en la consulta", detail: err.message });
  }
});

app.get("/api/top-countries-stats", async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT
        country,
        COUNT(*) AS total_restaurants,
        SUM(CASE WHEN LOWER(vegan_options) = 'y' THEN 1 ELSE 0 END) AS vegan,
        SUM(CASE WHEN LOWER(gluten_free) = 'y' THEN 1 ELSE 0 END) AS gluten_free
      FROM restaurants
      GROUP BY country
      ORDER BY total_restaurants DESC
      LIMIT 3;`
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: "Error en la consulta", detail: err.message });
  }
});


const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log(`API corriendo en http://localhost:${PORT}`);
});


app.get("/api/country-stats", async (req, res) => {
  const { country } = req.query;
  if (!country) return res.status(400).json({ error: "Country is required" });

  try {
    const result = await pool.query(
      `SELECT
        country,
        COUNT(*) AS total_restaurants,
        SUM(CASE WHEN LOWER(vegan_options) = 'y' THEN 1 ELSE 0 END) AS vegan,
        SUM(CASE WHEN LOWER(gluten_free) = 'y' THEN 1 ELSE 0 END) AS gluten_free
      FROM restaurants
      WHERE country = $1
      GROUP BY country;`,
      [country]
    );
    res.json(result.rows[0] || {});
  } catch (err) {
    res.status(500).json({ error: "Error en la consulta", detail: err.message });
  }
});

app.get("/api/country-prices", async (req, res) => {
  const { country } = req.query;
  if (!country) return res.status(400).json({ error: "Country is required" });

  try {
    const result = await pool.query(
      `SELECT
        SUM(CASE WHEN price_level = '€' THEN 1 ELSE 0 END) AS cheap,
        SUM(CASE WHEN price_level = '€€-€€€' THEN 1 ELSE 0 END) AS medium,
        SUM(CASE WHEN price_level = '€€€€' THEN 1 ELSE 0 END) AS luxury
      FROM restaurants
      WHERE country = $1;`,
      [country]
    );
    res.json(result.rows[0] || {});
  } catch (err) {
    res.status(500).json({ error: "Error en la consulta", detail: err.message });
  }
});

app.get('/api/restaurants', async (req, res) => {
  const { country } = req.query;
  if (!country) return res.status(400).json({ error: "Country is required" });

  // <<--- AQUÍ EL LOG
  console.log("Buscando restaurantes para país:", country);

  try {
    const result = await pool.query(
      `SELECT restaurant_name AS name, latitude AS lat, longitude AS lng
       FROM restaurants
       WHERE LOWER(country) = LOWER($1) AND latitude IS NOT NULL AND longitude IS NOT NULL`,
      [country]
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: "DB error", detail: err.message });
  }
});



app.get('/api/prices', async (req, res) => {
  const { country } = req.query;
  if (!country) {
    return res.status(400).json({ error: 'country is required' });
  }

  try {
    const result = await pool.query(
  `SELECT 
    restaurant_name AS name, 
    latitude AS lat, 
    longitude AS lng, 
    price_level 
  FROM restaurants 
  WHERE LOWER(country) = LOWER($1)
    AND latitude IS NOT NULL 
    AND longitude IS NOT NULL 
    AND price_level IS NOT NULL
    AND TRIM(price_level) <> ''`,
  [country]
    );
    res.json(result.rows);
  } catch (error) {
    console.error('Error en /api/prices:', error);
    res.status(500).json({ error: 'Error en el servidor' });
  }
});

app.get('/api/top-restaurants', async (req, res) => {
  const { country } = req.query;
  if (!country) return res.status(400).json({ error: "Country is required" });

  try {
    const result = await pool.query(
      `SELECT 
         restaurant_name AS name,
         city,
         avg_rating,
         total_reviews_count,
         latitude AS lat,
         longitude AS lng
       FROM restaurants
       WHERE LOWER(country) = LOWER($1)
         AND latitude IS NOT NULL AND longitude IS NOT NULL
       ORDER BY total_reviews_count DESC NULLS LAST
       LIMIT 3;`,
      [country]
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: "Error en la consulta", detail: err.message });
  }
});


app.get("/api/experience-by-country", async (req, res) => {
  const { country } = req.query;
  let filter = "";
  let params = [];
  if (country) {
    filter = "WHERE country = $1";
    params = [country];
  }
  try {
    const result = await pool.query(
      `SELECT 
        country,
        AVG(CASE WHEN food ~ '^[0-9]+(\\.[0-9]+)?$' THEN food::float ELSE NULL END) AS food,
        AVG(CASE WHEN service ~ '^[0-9]+(\\.[0-9]+)?$' THEN service::float ELSE NULL END) AS service,
        AVG(CASE WHEN value ~ '^[0-9]+(\\.[0-9]+)?$' THEN value::float ELSE NULL END) AS value,
        AVG(CASE WHEN atmosphere ~ '^[0-9]+(\\.[0-9]+)?$' THEN atmosphere::float ELSE NULL END) AS atmosphere
      FROM restaurants
      ${filter}
      GROUP BY country
      ORDER BY country`,
      params
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: "Error en experiencia", detail: err.message });
  }
});


app.get("/api/violin-cuisines", async (req, res) => {
  const { country } = req.query;
  let filter = "";
  let params = [];
  if (country) {
    filter = "AND country = $1";
    params = [country];
  }
  try {
    const result = await pool.query(
      `SELECT
         UNNEST(STRING_TO_ARRAY(cuisines, ',')) AS cuisine,
         avg_rating
       FROM restaurants
       WHERE avg_rating IS NOT NULL AND cuisines IS NOT NULL AND TRIM(cuisines) <> ''
       ${filter}`,
      params
    );
    const cuisineRatings = {};
    for (let row of result.rows) {
      const cuisine = row.cuisine.trim();
      if (!cuisineRatings[cuisine]) cuisineRatings[cuisine] = [];
      if (row.avg_rating !== null) cuisineRatings[cuisine].push(Number(row.avg_rating));
    }
    res.json(cuisineRatings);
  } catch (err) {
    res.status(500).json({ error: "Error en violin", detail: err.message });
  }
});

app.get("/api/price-vs-rating", async (req, res) => {
  const { country } = req.query;
  let filter = "";
  let params = [];
  if (country) {
    filter = "AND country = $1";
    params = [country];
  }
  try {
    const result = await pool.query(
      `SELECT
         restaurant_name AS name,
         avg_rating,
         price_level,
         total_reviews_count,
         country
       FROM restaurants
       WHERE avg_rating IS NOT NULL
         AND price_level IN ('€', '€€-€€€', '€€€€')
         AND TRIM(price_level) <> ''
         AND total_reviews_count IS NOT NULL
         AND total_reviews_count > 0
         ${filter}`,
      params
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: "Error en scatter", detail: err.message });
  }
});


app.get("/api/countries", async (req, res) => {
  try {
    const result = await pool.query(
      "SELECT DISTINCT country FROM restaurants WHERE country IS NOT NULL AND TRIM(country) <> '' ORDER BY country"
    );
    res.json(result.rows.map(r => r.country));
  } catch (err) {
    res.status(500).json({ error: "Error en lista de países", detail: err.message });
  }
});


app.get("/api/countries-avg", async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT
        country,
        AVG(avg_rating) AS avg_rating,
        AVG(
          CASE
            WHEN price_level = '€' THEN 1
            WHEN price_level = '€€-€€€' THEN 2
            WHEN price_level = '€€€€' THEN 3
            ELSE NULL
          END
        ) AS avg_price_level,
        COUNT(*) AS total_restaurants
      FROM restaurants
      WHERE avg_rating IS NOT NULL
        AND price_level IS NOT NULL
        AND TRIM(price_level) <> ''
        AND country IS NOT NULL
      GROUP BY country
      HAVING COUNT(*) > 8
      ORDER BY avg_rating DESC
      LIMIT 50;
    `);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: "Error en la consulta", detail: err.message });
  }
});


app.get("/api/countries-avg-rating", async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT
        country,
        ROUND(AVG(avg_rating)::numeric, 2) AS avg_rating,
        COUNT(*) AS total_restaurants
      FROM restaurants
      WHERE avg_rating IS NOT NULL AND country IS NOT NULL
      GROUP BY country
      HAVING COUNT(*) > 8
      ORDER BY avg_rating DESC
      LIMIT 20;
    `);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: "Error en la consulta", detail: err.message });
  }
});


// TOP 5 países con más restaurantes
app.get("/api/top-countries", async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT country, COUNT(*) AS count
      FROM restaurants
      WHERE country IS NOT NULL AND TRIM(country) <> ''
      GROUP BY country
      ORDER BY COUNT(*) DESC
      LIMIT 5;
    `);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: "Error al consultar top países", detail: err.message });
  }
});
