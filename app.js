(() => {
  const TZ = "Europe/Madrid";
  const $ = (id) => document.getElementById(id);

  // --- Clock / Date ---
  function tick() {
    const now = new Date();

    const parts = new Intl.DateTimeFormat("es-ES", {
      timeZone: TZ,
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: false
    }).formatToParts(now);

    const hh = parts.find(p => p.type === "hour")?.value ?? "--";
    const mm = parts.find(p => p.type === "minute")?.value ?? "--";
    const ss = parts.find(p => p.type === "second")?.value ?? "--";

    $("hhmm").textContent = `${hh}:${mm}`;
    $("ss").textContent = ss;

    const weekday = new Intl.DateTimeFormat("es-ES", { timeZone: TZ, weekday: "long" }).format(now);
    const day = new Intl.DateTimeFormat("es-ES", { timeZone: TZ, day: "2-digit" }).format(now);
    const month = new Intl.DateTimeFormat("es-ES", { timeZone: TZ, month: "long" }).format(now);

    $("weekday").textContent = weekday.charAt(0).toUpperCase() + weekday.slice(1);
    $("dayMonth").textContent = `${day} · ${month.charAt(0).toUpperCase() + month.slice(1)}`;
    $("tz").textContent = TZ;
  }

  setInterval(tick, 250);
  tick();

  // --- Weather (Open-Meteo) ---
  // Fallback: A Coruña (por si no hay geolocalización)
  const FALLBACK = { lat: 43.3623, lon: -8.4115, name: "A Coruña" };

  function weatherCodeToText(code) {
    const map = new Map([
      [0, "Despejado"],
      [1, "Mayormente despejado"],
      [2, "Parcialmente nublado"],
      [3, "Cubierto"],
      [45, "Niebla"],
      [48, "Niebla con cencellada"],
      [51, "Llovizna ligera"],
      [53, "Llovizna moderada"],
      [55, "Llovizna intensa"],
      [61, "Lluvia ligera"],
      [63, "Lluvia moderada"],
      [65, "Lluvia intensa"],
      [71, "Nieve ligera"],
      [73, "Nieve moderada"],
      [75, "Nieve intensa"],
      [80, "Chubascos ligeros"],
      [81, "Chubascos moderados"],
      [82, "Chubascos intensos"],
      [95, "Tormenta"],
      [96, "Tormenta con granizo"],
      [99, "Tormenta con granizo intenso"],
    ]);
    return map.get(code) ?? `Tiempo (código ${code})`;
  }

  async function fetchWeather(lat, lon, placeLabel) {
    $("status").textContent = "Obteniendo meteorología…";
    $("place").textContent = `Ubicación: ${placeLabel}`;

    const url =
      `https://api.open-meteo.com/v1/forecast` +
      `?latitude=${encodeURIComponent(lat)}` +
      `&longitude=${encodeURIComponent(lon)}` +
      `&current=temperature_2m,apparent_temperature,relative_humidity_2m,wind_speed_10m,weather_code` +
      `&timezone=${encodeURIComponent(TZ)}` +
      `&temperature_unit=celsius&wind_speed_unit=kmh`;

    const res = await fetch(url, { cache: "no-store" });
    if (!res.ok) throw new Error("No se pudo obtener el tiempo.");

    const data = await res.json();
    const c = data.current;

    $("temp").textContent = Math.round(c.temperature_2m);
    $("feels").textContent = Math.round(c.apparent_temperature);
    $("wind").textContent = Math.round(c.wind_speed_10m);
    $("humidity").textContent = Math.round(c.relative_humidity_2m);
    $("weatherText").textContent = weatherCodeToText(c.weather_code);

    // Hora de actualización en España
    const updated = new Intl.DateTimeFormat("es-ES", {
      timeZone: TZ,
      hour: "2-digit",
      minute: "2-digit",
      hour12: false
    }).format(new Date(c.time));

    $("updated").textContent = `Actualizado: ${updated}`;
    $("status").textContent = "Listo";
  }

  function useGeo() {
    if (!("geolocation" in navigator)) {
      $("status").textContent = "Geolocalización no disponible. Usando A Coruña.";
      return fetchWeather(FALLBACK.lat, FALLBACK.lon, FALLBACK.name);
    }

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude, longitude } = pos.coords;
        await fetchWeather(latitude, longitude, "Tu ubicación");
      },
      async () => {
        $("status").textContent = "Permiso denegado. Usando A Coruña.";
        await fetchWeather(FALLBACK.lat, FALLBACK.lon, FALLBACK.name);
      },
      { enableHighAccuracy: false, timeout: 6000, maximumAge: 10 * 60 * 1000 }
    );
  }

  useGeo();
  // refresco cada 15 minutos
  setInterval(useGeo, 15 * 60 * 1000);
})();
