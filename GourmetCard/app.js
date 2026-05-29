// Clave para guardar en el almacenamiento local (específica para Gourmet Card)
const CACHE_KEY = "gourmetCard_dashboardData";

// Función para actualizar la interfaz con los datos
function updateUI(data) {
  if (!data) return;

  // Mostrar datos en los contadores principales
  document.getElementById("today-count").textContent =
    data.todayCount !== undefined ? data.todayCount : "-";
  document.getElementById("yesterday-count").textContent =
    data.yesterdayCount !== undefined ? data.yesterdayCount : "-";
  document.getElementById("total-count").textContent =
    data.totalCount !== undefined ? data.totalCount : "-";

  // Configurar fechas de las tarjetas (hoy y ayer)
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  const options = {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  };
  const todayDateElement = document.getElementById("today-date");
  const yesterdayDateElement = document.getElementById("yesterday-date");

  if (todayDateElement)
    todayDateElement.textContent = today.toLocaleDateString("es-ES", options);
  if (yesterdayDateElement)
    yesterdayDateElement.textContent = yesterday.toLocaleDateString(
      "es-ES",
      options,
    );

  // Actualizar gráficos
  if (data.weeklyData) {
    updateWeeklyChart(data.weeklyData);
  }
  if (data.topHotels) {
    updateHotelsChart(data.topHotels);
  }

  // Actualizar fecha de la última consulta
  if (data.lastUpdateTimestamp) {
    const lastUpdateDate = new Date(data.lastUpdateTimestamp);
    const lastUpdateElement = document.getElementById("last-update");
    if (lastUpdateElement) {
      lastUpdateElement.textContent = lastUpdateDate.toLocaleString("es-MX");
    }
  }
}

// Función para obtener datos del servidor backend (SOLO se ejecuta al dar click en "Actualizar")
async function fetchDataFromServer() {
  try {
    updateStatus("Conectando y descargando datos...", "connected");

    // 1. Obtener estadísticas generales y semanales
    const statsResponse = await fetch("/api/stats");
    if (!statsResponse.ok)
      throw new Error("Error al obtener estadísticas del servidor");
    const statsData = await statsResponse.json();

    // 2. Obtener Top 10 Hoteles
    const hotelsResponse = await fetch("/api/top-hotels");
    let topHotelsData = { topHotels: [] };
    if (hotelsResponse.ok) {
      topHotelsData = await hotelsResponse.json();
    }

    // 3. Consolidar los datos en un solo objeto
    const finalData = {
      ...statsData,
      topHotels: topHotelsData.topHotels,
      lastUpdateTimestamp: new Date().toISOString(),
    };

    // Guardar en caché (localStorage)
    localStorage.setItem(CACHE_KEY, JSON.stringify(finalData));

    // Actualizar la interfaz
    updateUI(finalData);
    updateStatus("Datos actualizados desde el servidor", "connected");
  } catch (error) {
    console.error("Error en conexión:", error);
    updateStatus("Error al conectar: " + error.message, "error");
  }
}

// Función para actualizar el gráfico semanal
function updateWeeklyChart(weeklyData) {
  const chartContainer = document.getElementById("weekly-chart");
  const loadingDiv = document.getElementById("loading");

  if (!chartContainer) return;

  loadingDiv.style.display = "none";
  chartContainer.style.display = "flex";
  chartContainer.style.flexDirection = "column";

  let chartHTML = "";
  const maxCount = Math.max(...weeklyData.map((d) => d.count), 1);

  weeklyData.forEach((dayData) => {
    const width = (dayData.count / maxCount) * 100;
    chartHTML += `
            <div class="chart-bar" title="${dayData.dayFull || dayData.day} ${dayData.date}: ${dayData.count} registros">
                <div class="bar-label">
                    <strong>${dayData.day}</strong>
                    <small>${dayData.date}</small>
                </div>
                <div class="bar" style="width: ${width}%"></div>
                <div class="bar-count">${dayData.count}</div>
            </div>
        `;
  });

  chartContainer.innerHTML = chartHTML;
}

// Función para actualizar el gráfico de hoteles
function updateHotelsChart(topHotels) {
  const chartContainer = document.getElementById("hotels-chart");
  const loadingDiv = document.getElementById("loading-hotels");

  if (!chartContainer) return;

  loadingDiv.style.display = "none";
  chartContainer.style.display = "flex";
  chartContainer.style.flexDirection = "column";

  if (!topHotels || topHotels.length === 0) {
    chartContainer.innerHTML =
      '<p style="text-align: center; color: #666; padding: 40px;">No hay datos de hoteles disponibles</p>';
    return;
  }

  let chartHTML = "";
  const maxCount = Math.max(...topHotels.map((h) => h.count), 1);

  topHotels.forEach((hotel) => {
    const width = Math.max((hotel.count / maxCount) * 100, 5); // Mínimo 5% visual
    chartHTML += `
            <div class="chart-bar" title="Hotel ${hotel.hotelId}: ${hotel.count} usuarios registrados">
                <div class="bar-label">${hotel.hotelId}</div>
                <div class="bar" style="width: ${width}%"></div>
                <div class="bar-count">${hotel.count}</div>
            </div>
        `;
  });

  chartContainer.innerHTML = chartHTML;
}

// Función para buscar por hotel (Se mantiene independiente porque es on-demand)
async function searchHotel() {
  const hotelId = document.getElementById("hotel-search-input").value.trim();
  if (!hotelId) {
    alert("Por favor ingresa un ID de hotel");
    return;
  }

  const resultElement = document.getElementById("hotel-result");
  const searchBtn = document.getElementById("hotel-search-btn");

  // Estado de carga
  searchBtn.textContent = "⏳";
  searchBtn.disabled = true;
  resultElement.textContent = "...";

  try {
    const response = await fetch(
      `/api/hotel-users/${encodeURIComponent(hotelId)}`,
    );
    if (response.ok) {
      const data = await response.json();
      resultElement.textContent = data.userCount;
      document.getElementById("hotel-label").textContent =
        `usuarios del hotel "${hotelId}"`;
    } else {
      resultElement.textContent = "0";
    }
  } catch (error) {
    console.error("Error buscando hotel:", error);
    resultElement.textContent = "Error";
  } finally {
    searchBtn.textContent = "🔍";
    searchBtn.disabled = false;
  }
}

// Actualizar estado de conexión
function updateStatus(text, status) {
  const statusText = document.getElementById("status-text");
  const statusDot = document.getElementById("connection-status");
  if (statusText) statusText.textContent = text;
  if (statusDot) {
    statusDot.className = "status-dot";
    if (status) statusDot.classList.add(status);
  }
}

// Actualizar datos manualmente al dar click al botón
function refreshData() {
  fetchDataFromServer();
}

// Cargar datos al iniciar
document.addEventListener("DOMContentLoaded", () => {
  // Intentar leer los datos guardados en la sesión anterior
  const cachedDataString = localStorage.getItem(CACHE_KEY);

  if (cachedDataString) {
    // Si hay datos guardados, los mostramos sin consultar al backend
    try {
      const cachedData = JSON.parse(cachedDataString);
      updateUI(cachedData);
      updateStatus(
        "Datos cargados de la última sesión (Caché local)",
        "connected",
      );
    } catch (e) {
      console.error("Error leyendo la caché:", e);
      updateStatus("Error en caché. Presiona Actualizar.", "error");
    }
  } else {
    // Si es la primera vez que entra y no hay caché
    updateStatus(
      "Presiona 'Actualizar' para descargar los reportes",
      "connected",
    );
    document.getElementById("loading").textContent =
      "Esperando actualización manual...";
    document.getElementById("loading-hotels").textContent =
      "Esperando actualización manual...";
    document.getElementById("last-update").textContent = "Nunca";
  }

  // Agregar listener para Enter en búsqueda de hotel
  const searchInput = document.getElementById("hotel-search-input");
  if (searchInput) {
    searchInput.addEventListener("keypress", function (e) {
      if (e.key === "Enter") {
        searchHotel();
      }
    });
  }
});

// Exponer funciones globales
window.refreshData = refreshData;
window.searchHotel = searchHotel;
