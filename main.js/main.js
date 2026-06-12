const http = require("node:http");

const PORT = process.env.PORT || 4173;
const AVIATION_EDGE_AIRPORT_API = "https://aviation-edge.com/v2/public/airportDatabase";
const AVIATION_WEATHER_METAR_API = "https://aviationweather.gov/api/data/metar";

const fallbackAirports = {
  KIAH: { name: "George Bush Intercontinental Airport", city: "Houston", country: "United States", iata: "IAH", lat: 29.9844, lon: -95.3414 },
  KHOU: { name: "William P. Hobby Airport", city: "Houston", country: "United States", iata: "HOU", lat: 29.6454, lon: -95.2789 },
  KDFW: { name: "Dallas/Fort Worth International Airport", city: "Dallas-Fort Worth", country: "United States", iata: "DFW", lat: 32.8998, lon: -97.0403 },
  KLAX: { name: "Los Angeles International Airport", city: "Los Angeles", country: "United States", iata: "LAX", lat: 33.9416, lon: -118.4085 },
  KJFK: { name: "John F. Kennedy International Airport", city: "New York", country: "United States", iata: "JFK", lat: 40.6413, lon: -73.7781 },
  KORD: { name: "Chicago O'Hare International Airport", city: "Chicago", country: "United States", iata: "ORD", lat: 41.9742, lon: -87.9073 },
  KATL: { name: "Hartsfield-Jackson Atlanta International Airport", city: "Atlanta", country: "United States", iata: "ATL", lat: 33.6407, lon: -84.4277 },
  KMIA: { name: "Miami International Airport", city: "Miami", country: "United States", iata: "MIA", lat: 25.7959, lon: -80.287 },
  KDEN: { name: "Denver International Airport", city: "Denver", country: "United States", iata: "DEN", lat: 39.8561, lon: -104.6737 },
  KSEA: { name: "Seattle-Tacoma International Airport", city: "Seattle", country: "United States", iata: "SEA", lat: 47.4502, lon: -122.3088 }
};

const html = String.raw`<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>ICAO Airport + METAR Lookup</title>
  <style>
    :root {
      --ink: #17212b;
      --muted: #62707c;
      --line: #d7e0e7;
      --panel: #ffffff;
      --accent: #146c94;
      --accent-dark: #0f4f6c;
      --good: #177a4d;
      --warn: #b86225;
      font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
    }

    * { box-sizing: border-box; }

    body {
      align-items: center;
      background: linear-gradient(135deg, #eef5f7, #dfeaf0);
      color: var(--ink);
      display: flex;
      justify-content: center;
      margin: 0;
      min-height: 100vh;
      padding: 24px;
    }

    main {
      background: var(--panel);
      border: 1px solid var(--line);
      border-radius: 10px;
      box-shadow: 0 22px 58px rgba(31, 49, 61, 0.16);
      max-width: 780px;
      padding: 26px;
      width: 100%;
    }

    h1 {
      font-size: clamp(30px, 6vw, 54px);
      line-height: 1;
      margin: 0 0 8px;
    }

    p {
      color: var(--muted);
      font-size: 16px;
      line-height: 1.5;
      margin: 0;
    }

    form {
      display: grid;
      gap: 10px;
      grid-template-columns: 1fr auto;
      margin-top: 24px;
    }

    label {
      color: var(--muted);
      display: block;
      font-size: 12px;
      font-weight: 800;
      grid-column: 1 / -1;
      letter-spacing: 0.08em;
      text-transform: uppercase;
    }

    input {
      border: 1px solid #b9c8d2;
      border-radius: 8px;
      color: var(--ink);
      font-size: 24px;
      font-weight: 850;
      min-width: 0;
      outline: none;
      padding: 14px 16px;
      width: 100%;
    }

    #icaoInput {
      font-size: 30px;
      font-weight: 950;
      letter-spacing: 0.12em;
      text-transform: uppercase;
    }

    input:focus {
      border-color: var(--accent);
      box-shadow: 0 0 0 4px rgba(20, 108, 148, 0.15);
    }

    button,
    .airport-link {
      background: var(--accent);
      border: 0;
      border-radius: 8px;
      color: #fff;
      cursor: pointer;
      font-size: 15px;
      font-weight: 800;
      padding: 0 18px;
      text-decoration: none;
      white-space: nowrap;
    }

    button:hover,
    .airport-link:hover { background: var(--accent-dark); }

    button:disabled {
      background: #8fa3af;
      cursor: wait;
    }

    .api-key-row {
      display: grid;
      gap: 10px;
      grid-template-columns: 1fr;
      margin-top: 18px;
    }

    .api-key-row input {
      font-size: 16px;
      font-weight: 600;
      letter-spacing: 0;
    }

    .result {
      border-top: 1px solid var(--line);
      margin-top: 24px;
      padding-top: 22px;
    }

    .result h2 {
      font-size: 30px;
      line-height: 1.1;
      margin: 0 0 8px;
    }

    .grid {
      display: grid;
      gap: 10px;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      margin-top: 18px;
    }

    .box {
      background: #f6fafb;
      border: 1px solid #dfe8ed;
      border-radius: 8px;
      min-height: 78px;
      padding: 12px;
    }

    .box span {
      color: var(--muted);
      display: block;
      font-size: 12px;
      font-weight: 800;
      margin-bottom: 7px;
      text-transform: uppercase;
    }

    .box strong {
      display: block;
      font-size: 17px;
      line-height: 1.25;
      overflow-wrap: anywhere;
    }

    .airport-link {
      display: inline-flex;
      margin-top: 18px;
      padding: 12px 16px;
    }

    .metar {
      background: #202c35;
      border-radius: 8px;
      color: #eaf2f6;
      font: 14px/1.5 ui-monospace, SFMono-Regular, Consolas, "Liberation Mono", monospace;
      margin-top: 18px;
      overflow-wrap: anywhere;
      padding: 14px;
      white-space: pre-wrap;
    }

    .message {
      color: var(--warn);
      font-weight: 800;
      margin-top: 14px;
    }

    .source {
      color: var(--good);
      font-size: 13px;
      font-weight: 800;
      margin-top: 10px;
    }

    @media (max-width: 600px) {
      form,
      .grid { grid-template-columns: 1fr; }

      button { min-height: 50px; }
    }
  </style>
</head>
<body>
  <main>
    <h1>Airport Finder</h1>
    <p>Enter an ICAO code. It will show the airport name, give you an open-airport link, and load the METAR.</p>

    <div class="api-key-row">
      <label for="apiKeyInput">Aviation Edge API key</label>
      <input id="apiKeyInput" type="password" placeholder="Paste your Aviation Edge key here">
      <p>Your key stays in this browser and is only sent to your local app server.</p>
    </div>

    <form id="lookupForm">
      <label for="icaoInput">ICAO code</label>
      <input id="icaoInput" maxlength="4" autocomplete="off" spellcheck="false" placeholder="KIAH">
      <button id="lookupButton" type="submit">Find Airport</button>
    </form>

    <p class="message" id="messageText"></p>

    <section class="result" id="result" hidden>
      <h2 id="airportName"></h2>
      <p id="airportLocation"></p>
      <p class="source" id="sourceText"></p>

      <div class="grid">
        <div class="box">
          <span>ICAO</span>
          <strong id="icaoValue"></strong>
        </div>
        <div class="box">
          <span>IATA</span>
          <strong id="iataValue"></strong>
        </div>
        <div class="box">
          <span>Country</span>
          <strong id="countryValue"></strong>
        </div>
        <div class="box">
          <span>Coordinates</span>
          <strong id="coordinatesValue"></strong>
        </div>
      </div>

      <a class="airport-link" id="airportLink" target="_blank" rel="noopener">Open Airport</a>
      <pre class="metar" id="metarText">METAR will load here.</pre>
    </section>
  </main>

  <script>
    const form = document.querySelector("#lookupForm");
    const input = document.querySelector("#icaoInput");
    const button = document.querySelector("#lookupButton");
    const apiKeyInput = document.querySelector("#apiKeyInput");
    const messageText = document.querySelector("#messageText");
    const result = document.querySelector("#result");
    const airportName = document.querySelector("#airportName");
    const airportLocation = document.querySelector("#airportLocation");
    const sourceText = document.querySelector("#sourceText");
    const icaoValue = document.querySelector("#icaoValue");
    const iataValue = document.querySelector("#iataValue");
    const countryValue = document.querySelector("#countryValue");
    const coordinatesValue = document.querySelector("#coordinatesValue");
    const airportLink = document.querySelector("#airportLink");
    const metarText = document.querySelector("#metarText");

    apiKeyInput.value = localStorage.getItem("aviationEdgeApiKey") || "";
    apiKeyInput.addEventListener("input", () => {
      localStorage.setItem("aviationEdgeApiKey", apiKeyInput.value.trim());
    });

    function cleanIcao(value) {
      return value.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 4);
    }

    function setLoading(loading) {
      button.disabled = loading;
      button.textContent = loading ? "Finding..." : "Find Airport";
    }

    function firstAirport(data) {
      if (Array.isArray(data)) return data[0];
      if (data && Array.isArray(data.airports)) return data.airports[0];
      return data;
    }

    function normalizeAirport(airport, searchedIcao) {
      return {
        name: airport.nameAirport || airport.name || airport.airportName || "Airport " + searchedIcao,
        city: airport.nameCity || airport.city || "",
        country: airport.nameCountry || airport.country || "",
        icao: airport.codeIcaoAirport || airport.icao || searchedIcao,
        iata: airport.codeIataAirport || airport.iata || "--",
        lat: airport.latitudeAirport || airport.latitude || airport.lat || "",
        lon: airport.longitudeAirport || airport.longitude || airport.lng || ""
      };
    }

    function renderAirport(airport, source) {
      const locationText = [airport.city, airport.country].filter(Boolean).join(", ") || "Location found";
      const coordinates = airport.lat && airport.lon ? airport.lat + ", " + airport.lon : "--";

      airportName.textContent = airport.name;
      airportLocation.textContent = locationText;
      sourceText.textContent = source;
      icaoValue.textContent = airport.icao;
      iataValue.textContent = airport.iata;
      countryValue.textContent = airport.country || "--";
      coordinatesValue.textContent = coordinates;

      const query = airport.lat && airport.lon ? airport.lat + "," + airport.lon : airport.icao + " " + airport.name;
      airportLink.href = "https://www.google.com/maps/search/?api=1&query=" + encodeURIComponent(query);
      airportLink.textContent = "Open " + airport.icao;

      result.hidden = false;
    }

    async function lookupAirport(icao) {
      setLoading(true);
      messageText.textContent = "";
      metarText.textContent = "Loading METAR...";

      try {
        const airportResponse = await fetch("/api/airport/" + encodeURIComponent(icao), {
          headers: { "x-aviation-edge-key": apiKeyInput.value.trim() }
        });
        const airportData = await airportResponse.json();

        if (!airportResponse.ok) {
          throw new Error(airportData.error || "Airport not found.");
        }

        const airport = normalizeAirport(firstAirport(airportData.airport), icao);
        renderAirport(airport, airportData.source);
      } catch (error) {
        messageText.textContent = error.message;
      }

      try {
        const metarResponse = await fetch("/api/metar/" + encodeURIComponent(icao));
        const metarData = await metarResponse.json();
        metarText.textContent = metarData.raw || metarData.error || "No METAR found.";
      } catch {
        metarText.textContent = "Could not load METAR.";
      } finally {
        setLoading(false);
      }
    }

    input.addEventListener("input", () => {
      const icao = cleanIcao(input.value);
      if (input.value !== icao) input.value = icao;
      if (icao.length === 4) lookupAirport(icao);
    });

    form.addEventListener("submit", event => {
      event.preventDefault();
      const icao = cleanIcao(input.value);
      if (icao.length !== 4) {
        messageText.textContent = "Enter a 4-letter ICAO code, like KIAH.";
        return;
      }
      lookupAirport(icao);
    });
  </script>
</body>
</html>`;

function send(res, status, body, type = "text/plain; charset=utf-8") {
  res.writeHead(status, {
    "Content-Type": type,
    "Cache-Control": "no-store"
  });
  res.end(body);
}

function cleanIcao(value) {
  return String(value || "").toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 4);
}

async function lookupAirportWithAviationEdge(icao, key) {
  const url = `${AVIATION_EDGE_AIRPORT_API}?key=${encodeURIComponent(key)}&codeIcaoAirport=${encodeURIComponent(icao)}`;
  const response = await fetch(url);
  const text = await response.text();

  if (!response.ok) {
    throw new Error(text || `Aviation Edge returned ${response.status}`);
  }

  try {
    return JSON.parse(text);
  } catch {
    throw new Error("Aviation Edge did not return JSON.");
  }
}

async function lookupMetar(icao) {
  const url = `${AVIATION_WEATHER_METAR_API}?ids=${encodeURIComponent(icao)}&format=decoded`;
  const response = await fetch(url, {
    headers: { "User-Agent": "ICAO Airport Lookup Local App" }
  });

  const text = await response.text();
  if (!response.ok) {
    throw new Error(text || `AviationWeather returned ${response.status}`);
  }

  const rawMatch = text.match(/Text:\s*(.+)/);
  return rawMatch ? rawMatch[1].trim() : text.trim();
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host || "localhost"}`);

  if (url.pathname === "/" || url.pathname === "/main") {
    send(res, 200, html, "text/html; charset=utf-8");
    return;
  }

  if (url.pathname.startsWith("/api/airport/")) {
    const icao = cleanIcao(url.pathname.split("/").pop());

    if (icao.length !== 4) {
      send(res, 400, JSON.stringify({ error: "Enter a 4-letter ICAO code." }), "application/json; charset=utf-8");
      return;
    }

    const key = String(req.headers["x-aviation-edge-key"] || "").trim();

    try {
      if (key) {
        const airport = await lookupAirportWithAviationEdge(icao, key);
        send(res, 200, JSON.stringify({ source: "Airport data from Aviation Edge", airport }), "application/json; charset=utf-8");
        return;
      }

      if (fallbackAirports[icao]) {
        send(res, 200, JSON.stringify({ source: "Airport data from built-in fallback list. Add an Aviation Edge key for more airports.", airport: fallbackAirports[icao] }), "application/json; charset=utf-8");
        return;
      }

      send(res, 401, JSON.stringify({ error: "Paste your Aviation Edge API key to find this airport." }), "application/json; charset=utf-8");
    } catch (error) {
      if (fallbackAirports[icao]) {
        send(res, 200, JSON.stringify({ source: "Aviation Edge failed, so this used the built-in fallback list.", airport: fallbackAirports[icao] }), "application/json; charset=utf-8");
        return;
      }

      send(res, 500, JSON.stringify({ error: error.message }), "application/json; charset=utf-8");
    }
    return;
  }

  if (url.pathname.startsWith("/api/metar/")) {
    const icao = cleanIcao(url.pathname.split("/").pop());

    if (icao.length !== 4) {
      send(res, 400, JSON.stringify({ error: "Enter a 4-letter ICAO code." }), "application/json; charset=utf-8");
      return;
    }

    try {
      const raw = await lookupMetar(icao);
      send(res, 200, JSON.stringify({ raw }), "application/json; charset=utf-8");
    } catch (error) {
      send(res, 500, JSON.stringify({ error: error.message }), "application/json; charset=utf-8");
    }
    return;
  }

  send(res, 404, "Not found");
});

server.listen(PORT, () => {
  console.log(`Open http://localhost:${PORT}`);
});
