import { db } from "./firebase-config.js";
import {
  collection,
  getDocs,
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

let addressData = {};
let ageData = {};

// Llave única para Tijon
const CACHE_KEY = "tijon_dashboardData";

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

function updateUI(data) {
  document.getElementById("male-count").textContent = data.maleCount;
  document.getElementById("male-percentage").textContent =
    `(${data.malePercentage}%)`;
  document.getElementById("female-count").textContent = data.femaleCount;
  document.getElementById("female-percentage").textContent =
    `(${data.femalePercentage}%)`;
  document.getElementById("total-users").textContent = data.totalUsers;

  addressData = data.addressData;
  ageData = data.ageData;

  renderCharts();

  const lastUpdateDate = new Date(data.lastUpdateTimestamp);
  document.getElementById("last-update").textContent =
    lastUpdateDate.toLocaleString("es-MX");
}

async function fetchUserDataFromFirestore() {
  try {
    updateStatus("Conectando y descargando datos...", "connected");

    const querySnapshot = await getDocs(collection(db, "user_profile"));

    let maleCount = 0;
    let femaleCount = 0;
    let maleAges = [];
    let femaleAges = [];
    let tempAddressData = {};

    querySnapshot.forEach((doc) => {
      const data = doc.data();

      if (data.gender) {
        const gender = data.gender.toLowerCase().trim();
        if (["hombre", "h", "male", "m", "masculino"].includes(gender)) {
          maleCount++;
        } else if (["mujer", "f", "female", "femenino"].includes(gender)) {
          femaleCount++;
        }
      }

      if (data.address) {
        tempAddressData[data.address] =
          (tempAddressData[data.address] || 0) + 1;
      }

      if (data.birthday) {
        try {
          let birthDate = data.birthday.toDate
            ? data.birthday.toDate()
            : new Date(data.birthday);
          const age = calculateAge(birthDate);
          if (age !== null) {
            const genderLower = data.gender
              ? data.gender.toLowerCase().trim()
              : "";
            if (
              ["hombre", "h", "male", "m", "masculino"].includes(genderLower)
            ) {
              maleAges.push(age);
            } else if (
              ["mujer", "f", "female", "femenino"].includes(genderLower)
            ) {
              femaleAges.push(age);
            }
          }
        } catch (e) {
          console.error("Error procesando fecha:", e);
        }
      }
    });

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

    const tempAgeData = {
      Hombres: parseFloat(maleAgeAvg),
      Mujeres: parseFloat(femaleAgeAvg),
      Total: parseFloat(totalAgeAvg),
    };

    const totalUsers = maleCount + femaleCount;
    const malePercentage =
      totalUsers > 0 ? ((maleCount / totalUsers) * 100).toFixed(1) : 0;
    const femalePercentage =
      totalUsers > 0 ? ((femaleCount / totalUsers) * 100).toFixed(1) : 0;

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

    localStorage.setItem(CACHE_KEY, JSON.stringify(finalData));
    updateUI(finalData);
    updateStatus("Datos actualizados desde Firestore", "connected");
  } catch (error) {
    console.error("Error obteniendo datos:", error);
    updateStatus("Error al conectar", "error");
  }
}

function renderCharts() {
  renderAddressChart();
  renderAgeChart();
}

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
            <div class="bar-label"><strong>${shortAddress}</strong></div>
            <div class="bar" style="width: ${width}%;"></div>
            <div class="bar-count">${count}</div>
        `;
    chart.appendChild(bar);
  });

  loading.style.display = "none";
  chart.style.display = "flex";
}

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
            <div class="bar-label"><strong>${gender}</strong></div>
            <div class="bar" style="width: ${width}%;"></div>
            <div class="bar-count">${age} años</div>
        `;
    chart.appendChild(bar);
  });

  loading.style.display = "none";
  chart.style.display = "flex";
}

function updateStatus(text, status) {
  document.getElementById("status-text").textContent = text;
  const dot = document.getElementById("connection-status");
  dot.className = "status-dot " + status;
}

function refreshData() {
  updateStatus("Actualizando...", "connected");
  fetchUserDataFromFirestore();
}

window.addEventListener("DOMContentLoaded", () => {
  const cachedDataString = localStorage.getItem(CACHE_KEY);
  if (cachedDataString) {
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

window.refreshData = refreshData;
