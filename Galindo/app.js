import { db } from "./firebase-config.js";
import {
  collection,
  getDocs,
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

let addressData = {};
let ageData = {};
let emailData = {};
let birthdayMonthData = {};
let topDistralData = [];
let topMisayaData = [];
// NUEVAS VARIABLES OPERATIVAS
let resServiceData = {};
let healthAlertsData = {};

const CACHE_KEY = "galindo_dashboardData";

function calculateAge(birthDate) {
  const today = new Date();
  let age = today.getFullYear() - birthDate.getFullYear();
  const monthDiff = today.getMonth() - birthDate.getMonth();
  if (
    monthDiff < 0 ||
    (monthDiff === 0 && today.getDate() < birthDate.getDate())
  )
    age--;
  return age >= 0 ? age : null;
}

function updateUI(data) {
  document.getElementById("male-count").textContent = data.maleCount;
  document.getElementById("male-percentage").textContent =
    `(${data.malePercentage}%)`;
  document.getElementById("female-count").textContent = data.femaleCount;
  document.getElementById("female-percentage").textContent =
    `(${data.femalePercentage}%)`;
  document.getElementById("other-count").textContent = data.otherCount || 0;
  document.getElementById("other-percentage").textContent =
    `(${data.otherPercentage || 0}%)`;

  document.getElementById("total-users").textContent = data.totalUsers;
  document.getElementById("distral-count").textContent = data.distralCount;
  document.getElementById("misaya-count").textContent = data.misayaCount;

  // NUEVAS TARJETAS
  document.getElementById("spa-clients-count").textContent =
    data.totalSpaClients || 0;
  document.getElementById("avg-cabin-time").textContent =
    data.avgCabinTime || 0;

  addressData = data.addressData || {};
  ageData = data.ageData || {};
  emailData = data.emailData || {};
  birthdayMonthData = data.birthdayMonthData || {};
  topDistralData = data.topDistralData || [];
  topMisayaData = data.topMisayaData || [];
  resServiceData = data.resServiceData || {};
  healthAlertsData = data.healthAlertsData || {};

  renderCharts();

  const lastUpdateDate = new Date(data.lastUpdateTimestamp);
  document.getElementById("last-update").textContent =
    lastUpdateDate.toLocaleString("es-MX");
}

async function fetchUserDataFromFirestore() {
  try {
    updateStatus("Conectando y descargando datos...", "connected");

    // 1. EXTRAER PERFILES DE USUARIO
    const querySnapshot = await getDocs(collection(db, "user_profile"));

    let maleCount = 0,
      femaleCount = 0,
      otherCount = 0;
    let distralCount = 0,
      misayaCount = 0;
    let maleAges = [],
      femaleAges = [],
      otherAges = [];

    let tempAddressData = {},
      tempEmailData = {},
      tempBirthdayMonthData = {};
    let tempDistralClientes = [],
      tempMisayaClientes = [];
    const monthNames = [
      "Enero",
      "Febrero",
      "Marzo",
      "Abril",
      "Mayo",
      "Junio",
      "Julio",
      "Agosto",
      "Septiembre",
      "Octubre",
      "Noviembre",
      "Diciembre",
    ];

    querySnapshot.forEach((doc) => {
      const data = doc.data();
      if (data.gender) {
        const gender = data.gender.toLowerCase().trim();
        if (["hombre", "h", "male", "m", "masculino"].includes(gender))
          maleCount++;
        else if (["mujer", "f", "female", "femenino"].includes(gender))
          femaleCount++;
        else otherCount++;
      }

      if (data.address)
        tempAddressData[data.address] =
          (tempAddressData[data.address] || 0) + 1;
      if (data.email) {
        const parts = data.email.split("@");
        if (parts.length === 2)
          tempEmailData[parts[1].toLowerCase().trim()] =
            (tempEmailData[parts[1].toLowerCase().trim()] || 0) + 1;
      }
      if (data.birthday) {
        try {
          let birthDate = data.birthday.toDate
            ? data.birthday.toDate()
            : new Date(data.birthday);
          const month = monthNames[birthDate.getMonth()];
          if (month)
            tempBirthdayMonthData[month] =
              (tempBirthdayMonthData[month] || 0) + 1;
          const age = calculateAge(birthDate);
          if (age !== null) {
            const gLower = data.gender ? data.gender.toLowerCase().trim() : "";
            if (["hombre", "h", "male", "m", "masculino"].includes(gLower))
              maleAges.push(age);
            else if (["mujer", "f", "female", "femenino"].includes(gLower))
              femaleAges.push(age);
            else otherAges.push(age);
          }
        } catch (e) {}
      }

      let visitas = Number(data.visitas) || 0;
      let points = Number(data.points) || 0;
      let userName =
        data.name || data.email || "Usuario " + doc.id.substring(0, 5);

      if (data.service) {
        const service = data.service.toLowerCase().trim();
        if (service.includes("distral") || service.includes("la distral")) {
          distralCount++;
          if (visitas > 0 || points > 0)
            tempDistralClientes.push({ name: userName, visitas, points });
        } else if (
          service.includes("misaya") ||
          service.includes("spa misaya")
        ) {
          misayaCount++;
          if (visitas > 0 || points > 0)
            tempMisayaClientes.push({ name: userName, visitas, points });
        }
      }
    });

    tempDistralClientes.sort((a, b) => b.visitas - a.visitas);
    tempMisayaClientes.sort((a, b) => b.visitas - a.visitas);
    const finalTopDistral = tempDistralClientes.slice(0, 15);
    const finalTopMisaya = tempMisayaClientes.slice(0, 15);

    // 2. EXTRAER RESERVACIONES Y MÉTRICAS OPERATIVAS
    const resSnapshot = await getDocs(collection(db, "reservations"));
    let totalSpaClients = 0;
    let totalDuration = 0;
    let validDurationCount = 0;
    let tempResServiceData = {};
    let tempHealthAlerts = {
      "Sin alertas médicas": 0,
      "Con condición / alergia": 0,
    };

    resSnapshot.forEach((doc) => {
      const data = doc.data();

      // Flujo de clientes (personas)
      let persons = Number(data.persons);
      if (isNaN(persons) || persons <= 0) persons = 1; // Resguardo en caso de que venga vacío
      totalSpaClients += persons;

      // Tiempo en cabina (duración)
      let dur = Number(data.duration);
      if (!isNaN(dur) && dur > 0) {
        totalDuration += dur;
        validDurationCount++;
      }

      // Tratamientos reservados
      if (data.service) {
        tempResServiceData[data.service] =
          (tempResServiceData[data.service] || 0) + 1;
      }

      // Alertas de Salud
      let hasAlert = false;
      const alg = (data.alergies || "").toLowerCase().trim();
      const cond = (data.conditions || "").toLowerCase().trim();

      // Limpiamos los "ninguna" o campos vacíos para detectar alertas reales
      if (
        alg &&
        alg !== "ninguna" &&
        alg !== "ninguno" &&
        alg !== "none" &&
        alg !== "no"
      )
        hasAlert = true;
      if (
        cond &&
        cond !== "ninguna" &&
        cond !== "ninguno" &&
        cond !== "none" &&
        cond !== "no"
      )
        hasAlert = true;

      if (hasAlert) tempHealthAlerts["Con condición / alergia"]++;
      else tempHealthAlerts["Sin alertas médicas"]++;
    });

    const avgCabinTime =
      validDurationCount > 0
        ? Math.round(totalDuration / validDurationCount)
        : 0;

    // Limpiar alertas vacías para no ensuciar la gráfica
    if (tempHealthAlerts["Con condición / alergia"] === 0)
      delete tempHealthAlerts["Con condición / alergia"];
    if (tempHealthAlerts["Sin alertas médicas"] === 0)
      delete tempHealthAlerts["Sin alertas médicas"];

    // 3. CÁLCULOS DEMOGRÁFICOS FINALES
    const totalUsers = maleCount + femaleCount + otherCount;
    const maleAgeAvg =
      maleAges.length > 0
        ? (maleAges.reduce((a, b) => a + b, 0) / maleAges.length).toFixed(1)
        : 0;
    const femaleAgeAvg =
      femaleAges.length > 0
        ? (femaleAges.reduce((a, b) => a + b, 0) / femaleAges.length).toFixed(1)
        : 0;
    const otherAgeAvg =
      otherAges.length > 0
        ? (otherAges.reduce((a, b) => a + b, 0) / otherAges.length).toFixed(1)
        : 0;
    const allAges = maleAges.concat(femaleAges).concat(otherAges);
    const totalAgeAvg =
      allAges.length > 0
        ? (allAges.reduce((a, b) => a + b, 0) / allAges.length).toFixed(1)
        : 0;

    let tempAgeData = {
      Hombres: parseFloat(maleAgeAvg),
      Mujeres: parseFloat(femaleAgeAvg),
    };
    if (parseFloat(otherAgeAvg) > 0)
      tempAgeData["Otros"] = parseFloat(otherAgeAvg);
    tempAgeData["Total"] = parseFloat(totalAgeAvg);

    const finalData = {
      maleCount,
      femaleCount,
      otherCount,
      totalUsers,
      distralCount,
      misayaCount,
      totalSpaClients,
      avgCabinTime, // Nuevas métricas
      malePercentage:
        totalUsers > 0 ? ((maleCount / totalUsers) * 100).toFixed(1) : 0,
      femalePercentage:
        totalUsers > 0 ? ((femaleCount / totalUsers) * 100).toFixed(1) : 0,
      otherPercentage:
        totalUsers > 0 ? ((otherCount / totalUsers) * 100).toFixed(1) : 0,
      addressData: tempAddressData,
      ageData: tempAgeData,
      emailData: tempEmailData,
      birthdayMonthData: tempBirthdayMonthData,
      topDistralData: finalTopDistral,
      topMisayaData: finalTopMisaya,
      resServiceData: tempResServiceData,
      healthAlertsData: tempHealthAlerts,
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
  renderResServiceChart(); // NUEVO
  renderHealthAlertsChart(); // NUEVO
  renderEmailChart();
  renderBirthdayChart();
  renderAddressChart();
  renderAgeChart();
  renderDistralTable();
  renderMisayaTable();
}

function renderResServiceChart() {
  const chart = document.getElementById("res-service-chart");
  const loading = document.getElementById("loading-res-service");
  if (Object.keys(resServiceData).length === 0) {
    loading.textContent = "No hay datos de tratamientos";
    return;
  }
  const sorted = Object.entries(resServiceData).sort((a, b) => b[1] - a[1]);
  chart.innerHTML = "";
  const maxCount = Math.max(...sorted.map((item) => item[1]));
  sorted.forEach(([service, count]) => {
    const width = (count / maxCount) * 100;
    const bar = document.createElement("div");
    bar.className = "chart-bar";
    bar.innerHTML = `<div class="bar-label"><strong>${service}</strong></div><div class="bar" style="width: ${width}%;"></div><div class="bar-count">${count}</div>`;
    chart.appendChild(bar);
  });
  loading.style.display = "none";
  chart.style.display = "flex";
}

function renderHealthAlertsChart() {
  const chart = document.getElementById("health-chart");
  const loading = document.getElementById("loading-health");
  if (Object.keys(healthAlertsData).length === 0) {
    loading.textContent = "No hay datos médicos";
    return;
  }
  const sorted = Object.entries(healthAlertsData).sort((a, b) => b[1] - a[1]);
  chart.innerHTML = "";
  const maxCount = Math.max(...sorted.map((item) => item[1]));
  sorted.forEach(([alert, count]) => {
    const width = (count / maxCount) * 100;
    const bar = document.createElement("div");
    bar.className = "chart-bar";
    bar.innerHTML = `<div class="bar-label"><strong>${alert}</strong></div><div class="bar" style="width: ${width}%;"></div><div class="bar-count">${count}</div>`;
    chart.appendChild(bar);
  });
  loading.style.display = "none";
  chart.style.display = "flex";
}

function renderEmailChart() {
  const chart = document.getElementById("email-chart");
  const loading = document.getElementById("loading-email");
  if (Object.keys(emailData).length === 0) {
    loading.textContent = "No hay datos de correo";
    return;
  }
  const sorted = Object.entries(emailData)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);
  chart.innerHTML = "";
  const maxCount = Math.max(...sorted.map((item) => item[1]));
  sorted.forEach(([domain, count]) => {
    const width = (count / maxCount) * 100;
    const bar = document.createElement("div");
    bar.className = "chart-bar";
    bar.innerHTML = `<div class="bar-label"><strong>${domain}</strong></div><div class="bar" style="width: ${width}%;"></div><div class="bar-count">${count}</div>`;
    chart.appendChild(bar);
  });
  loading.style.display = "none";
  chart.style.display = "flex";
}

function renderBirthdayChart() {
  const chart = document.getElementById("birthdays-chart");
  const loading = document.getElementById("loading-birthdays");
  if (Object.keys(birthdayMonthData).length === 0) {
    loading.textContent = "No hay datos de fechas";
    return;
  }
  const sorted = Object.entries(birthdayMonthData)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10);
  chart.innerHTML = "";
  const maxCount = Math.max(...sorted.map((item) => item[1]));
  sorted.forEach(([month, count]) => {
    const width = (count / maxCount) * 100;
    const bar = document.createElement("div");
    bar.className = "chart-bar";
    bar.innerHTML = `<div class="bar-label"><strong>${month}</strong></div><div class="bar" style="width: ${width}%;"></div><div class="bar-count">${count}</div>`;
    chart.appendChild(bar);
  });
  loading.style.display = "none";
  chart.style.display = "flex";
}

function renderAddressChart() {
  const chart = document.getElementById("address-chart");
  const loading = document.getElementById("loading-address");
  if (Object.keys(addressData).length === 0) {
    loading.textContent = "No hay datos";
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
    bar.innerHTML = `<div class="bar-label"><strong>${shortAddress}</strong></div><div class="bar" style="width: ${width}%;"></div><div class="bar-count">${count}</div>`;
    chart.appendChild(bar);
  });
  loading.style.display = "none";
  chart.style.display = "flex";
}

function renderAgeChart() {
  const chart = document.getElementById("age-chart");
  const loading = document.getElementById("loading-age");
  if (Object.keys(ageData).length === 0) {
    loading.textContent = "No hay datos";
    return;
  }
  chart.innerHTML = "";
  const maxAge = Math.max(...Object.values(ageData));
  Object.entries(ageData).forEach(([gender, age]) => {
    const width = (age / maxAge) * 100;
    const bar = document.createElement("div");
    bar.className = "chart-bar";
    bar.innerHTML = `<div class="bar-label"><strong>${gender}</strong></div><div class="bar" style="width: ${width}%;"></div><div class="bar-count">${age} años</div>`;
    chart.appendChild(bar);
  });
  loading.style.display = "none";
  chart.style.display = "flex";
}

function renderDistralTable() {
  const container = document.getElementById("distral-table-container");
  const tbody = document.querySelector("#distral-table tbody");
  const loading = document.getElementById("loading-distral-clientes");
  if (!topDistralData || topDistralData.length === 0) {
    loading.textContent = "No hay registros de lealtad para La Distral.";
    return;
  }
  tbody.innerHTML = "";
  const maxVisitas =
    topDistralData[0].visitas > 0 ? topDistralData[0].visitas : 1;
  topDistralData.forEach((user, index) => {
    let porcentajeAvance = (user.visitas / maxVisitas) * 100;
    const tr = document.createElement("tr");
    tr.innerHTML = `
          <td><strong>#${index + 1}</strong> ${user.name}</td>
          <td>
              <div class="progress-wrapper">
                  <span class="pct-text">${user.visitas}</span>
                  <div class="progress-bar-bg">
                      <div class="progress-bar-fill" style="width: ${porcentajeAvance}%;"></div>
                  </div>
              </div>
          </td>
          <td><span class="badge-stamps">${user.points} pts</span></td>
      `;
    tbody.appendChild(tr);
  });
  loading.style.display = "none";
  container.style.display = "block";
}

function renderMisayaTable() {
  const container = document.getElementById("misaya-table-container");
  const tbody = document.querySelector("#misaya-table tbody");
  const loading = document.getElementById("loading-misaya-clientes");
  if (!topMisayaData || topMisayaData.length === 0) {
    loading.textContent = "No hay registros de lealtad para Misaya.";
    return;
  }
  tbody.innerHTML = "";
  const maxVisitas =
    topMisayaData[0].visitas > 0 ? topMisayaData[0].visitas : 1;
  topMisayaData.forEach((user, index) => {
    let porcentajeAvance = (user.visitas / maxVisitas) * 100;
    const tr = document.createElement("tr");
    tr.innerHTML = `
          <td><strong>#${index + 1}</strong> ${user.name}</td>
          <td>
              <div class="progress-wrapper">
                  <span class="pct-text misaya-text">${user.visitas}</span>
                  <div class="progress-bar-bg">
                      <div class="progress-bar-fill misaya-fill" style="width: ${porcentajeAvance}%;"></div>
                  </div>
              </div>
          </td>
          <td><span class="badge-stamps misaya-badge">${user.points} pts</span></td>
      `;
    tbody.appendChild(tr);
  });
  loading.style.display = "none";
  container.style.display = "block";
}

function updateStatus(text, status) {
  document.getElementById("status-text").textContent = text;
  document.getElementById("connection-status").className =
    "status-dot " + status;
}

function refreshData() {
  updateStatus("Actualizando...", "connected");
  fetchUserDataFromFirestore();
}

window.addEventListener("DOMContentLoaded", () => {
  const cachedDataString = localStorage.getItem(CACHE_KEY);
  if (cachedDataString) {
    try {
      updateUI(JSON.parse(cachedDataString));
      updateStatus("Datos cargados de caché local", "connected");
    } catch (e) {
      updateStatus("Error en caché. Presiona Actualizar.", "error");
    }
  } else {
    updateStatus("Presiona 'Actualizar' para descargar", "connected");
  }
});
window.refreshData = refreshData;
