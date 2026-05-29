import { db } from "./firebase-config.js";
import {
  collection,
  getDocs,
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

let addressData = {};
let ageData = {};
let serviceData = {};

// Clave para guardar en el almacenamiento local (específica para Courtyard)
const CACHE_KEY = "courtyard_dashboardData";

// Función para calcular edad a partir de fecha de nacimiento
function calculateAge(birthDate) {
  const today = new Date();
  let age = today.getFullYear() - birthDate.getFullYear();
  const monthDiff = today.getMonth() - birthDate.getMonth();

  if (
    monthDiff < 0 ||
    (monthDiff === 0 && today.getDate() < birthDate.getDate())
  ) {
    age--;
  }

  return age >= 0 ? age : null;
}

// NUEVO: Función para actualizar la interfaz gráfica
function updateUI(data) {
  document.getElementById("male-count").textContent = data.maleCount;
  document.getElementById("male-percentage").textContent =
    `(${data.malePercentage}%)`;
  document.getElementById("female-count").textContent = data.femaleCount;
  document.getElementById("female-percentage").textContent =
    `(${data.femalePercentage}%)`;
  document.getElementById("total-users").textContent = data.totalUsers;

  // Actualizar variables globales para las gráficas
  addressData = data.addressData;
  ageData = data.ageData;

  // IMPORTANTE: Llamamos a la función de las gráficas
  renderCharts();

  // Actualizar fecha de la última consulta
  const lastUpdateDate = new Date(data.lastUpdateTimestamp);
  document.getElementById("last-update").textContent =
    lastUpdateDate.toLocaleString("es-MX");
}

// Función para obtener datos de Firestore (SOLO se ejecuta al dar click en "Actualizar")
async function fetchUserDataFromFirestore() {
  try {
    updateStatus("Conectando y descargando datos...", "connected");
    const querySnapshot = await getDocs(collection(db, "user_profile"));

    let maleCount = 0;
    let femaleCount = 0;
    let maleAges = [];
    let femaleAges = [];

    let tempAddressData = {};
    let tempAgeData = {};

    querySnapshot.forEach((doc) => {
      const data = doc.data();

      // Procesar género
      if (data.gender) {
        const gender = data.gender.toLowerCase().trim();

        if (
          gender === "hombre" ||
          gender === "h" ||
          gender === "male" ||
          gender === "m" ||
          gender === "masculino"
        ) {
          maleCount++;
        } else if (
          gender === "mujer" ||
          gender === "f" ||
          gender === "female" ||
          gender === "femenino"
        ) {
          femaleCount++;
        }
      }

      // Procesar direcciones
      if (data.address) {
        tempAddressData[data.address] =
          (tempAddressData[data.address] || 0) + 1;
      }

      // Procesar edades
      if (data.birthday) {
        try {
          let birthDate;
          if (data.birthday.toDate) {
            birthDate = data.birthday.toDate();
          } else {
            birthDate = new Date(data.birthday);
          }

          const age = calculateAge(birthDate);
          if (age !== null) {
            const genderLower = data.gender
              ? data.gender.toLowerCase().trim()
              : "";

            if (
              genderLower === "hombre" ||
              genderLower === "h" ||
              genderLower === "male" ||
              genderLower === "m" ||
              genderLower === "masculino"
            ) {
              maleAges.push(age);
            } else if (
              genderLower === "mujer" ||
              genderLower === "f" ||
              genderLower === "female" ||
              genderLower === "femenino"
            ) {
              femaleAges.push(age);
            }
          }
        } catch (e) {
          console.error("Error procesando fecha:", e);
        }
      }
    });

    // Calcular promedios de edad
    const maleAgeAvg =
      maleAges.length > 0
        ? (maleAges.reduce((a, b) => a + b, 0) / maleAges.length).toFixed(1)
        : 0;
    const femaleAgeAvg =
      femaleAges.length > 0
        ? (femaleAges.reduce((a, b) => a + b, 0) / femaleAges.length).toFixed(1)
        : 0;
    const totalAgeAvg =
      maleAges.concat(femaleAges).length > 0
        ? (
            maleAges.concat(femaleAges).reduce((a, b) => a + b, 0) /
            (maleAges.length + femaleAges.length)
          ).toFixed(1)
        : 0;

    tempAgeData = {
      Hombres: parseFloat(maleAgeAvg),
      Mujeres: parseFloat(femaleAgeAvg),
      Total: parseFloat(totalAgeAvg),
    };

    // Actualizar contadores
    const totalUsers = maleCount + femaleCount;
    const malePercentage =
      totalUsers > 0 ? ((maleCount / totalUsers) * 100).toFixed(1) : 0;
    const femalePercentage =
      totalUsers > 0 ? ((femaleCount / totalUsers) * 100).toFixed(1) : 0;

    // Crear el objeto de datos finales
    const finalData = {
      maleCount,
      femaleCount,
      totalUsers,
      malePercentage,
      femalePercentage,
      addressData: tempAddressData,
      ageData: tempAgeData,
      lastUpdateTimestamp: new Date().toISOString(),
    };

    // Guardar en caché (localStorage)
    localStorage.setItem(CACHE_KEY, JSON.stringify(finalData));

    // Actualizar la interfaz
    updateUI(finalData);
    updateStatus("Datos actualizados desde Firestore", "connected");
  } catch (error) {
    console.error("Error obteniendo datos:", error);
    updateStatus("Error al conectar", "error");
  }
}

// Función para renderizar gráficos
function renderCharts() {
  renderAddressChart();
  renderAgeChart();
}

// Gráfico de direcciones
function renderAddressChart() {
  const chart = document.getElementById("address-chart");
  const loading = document.getElementById("loading-address");

  if (Object.keys(addressData).length === 0) {
    loading.textContent = "No hay datos disponibles";
    return;
  }

  const sorted = Object.entries(addressData)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10);

  chart.innerHTML = "";
  const maxCount = Math.max(...sorted.map((item) => item[1]));

  sorted.forEach(([address, count]) => {
    const width = (count / maxCount) * 100;
    const shortAddress =
      address.length > 30 ? address.substring(0, 30) + "..." : address;

    const bar = document.createElement("div");
    bar.className = "chart-bar";
    bar.innerHTML = `
            <div class="bar-label">
                <strong>${shortAddress}</strong>
            </div>
            <div class="bar" style="width: ${width}%;"></div>
            <div class="bar-count">${count}</div>
        `;
    chart.appendChild(bar);
  });

  loading.style.display = "none";
  chart.style.display = "flex";
}

// Gráfico de edades
function renderAgeChart() {
  const chart = document.getElementById("age-chart");
  const loading = document.getElementById("loading-age");

  if (Object.keys(ageData).length === 0) {
    loading.textContent = "No hay datos disponibles";
    return;
  }

  chart.innerHTML = "";
  const maxAge = Math.max(...Object.values(ageData));

  Object.entries(ageData).forEach(([gender, age]) => {
    const width = (age / maxAge) * 100;

    const bar = document.createElement("div");
    bar.className = "chart-bar";
    bar.innerHTML = `
            <div class="bar-label">
                <strong>${gender}</strong>
            </div>
            <div class="bar" style="width: ${width}%;"></div>
            <div class="bar-count">${age} años</div>
        `;
    chart.appendChild(bar);
  });

  loading.style.display = "none";
  chart.style.display = "flex";
}

// Actualizar estado de conexión
function updateStatus(text, status) {
  document.getElementById("status-text").textContent = text;
  const dot = document.getElementById("connection-status");
  dot.className = "status-dot " + status;
}

// Actualizar datos manualmente al dar click al botón
function refreshData() {
  updateStatus("Actualizando...", "connected");
  fetchUserDataFromFirestore();
}

// Cargar datos al iniciar
window.addEventListener("DOMContentLoaded", () => {
  // Intentar leer los datos guardados en la sesión anterior
  const cachedDataString = localStorage.getItem(CACHE_KEY);

  if (cachedDataString) {
    // Si hay datos guardados, los mostramos sin consultar a Firebase
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
    document.getElementById("loading-address").textContent =
      "Esperando actualización manual...";
    document.getElementById("loading-age").textContent =
      "Esperando actualización manual...";
    document.getElementById("last-update").textContent = "Nunca";
  }
});

// Exponer función global
window.refreshData = refreshData;
