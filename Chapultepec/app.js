import { db } from "./firebase-config.js";
import {
  collection,
  getDocs,
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

let addressData = {};
let ageData = {};
let serviceData = {};
let resGenderData = {};
let topClientesData = [];
// NUEVAS VARIABLES
let emailData = {};
let birthdayMonthData = {};

const CACHE_KEY = "chapultepec_dashboardData";

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
  document.getElementById("reservations-count").textContent =
    data.totalReservations || 0;
  document.getElementById("visitas-count").textContent = data.totalVisitas || 0;

  addressData = data.addressData || {};
  ageData = data.ageData || {};
  serviceData = data.serviceData || {};
  resGenderData = data.resGenderData || {};
  topClientesData = data.topClientesData || [];
  // ASIGNAR NUEVAS VARIABLES
  emailData = data.emailData || {};
  birthdayMonthData = data.birthdayMonthData || {};

  renderCharts();

  const lastUpdateDate = new Date(data.lastUpdateTimestamp);
  document.getElementById("last-update").textContent =
    lastUpdateDate.toLocaleString("es-MX");
}

async function fetchUserDataFromFirestore() {
  try {
    updateStatus("Conectando y cruzando datos...", "connected");

    const querySnapshot = await getDocs(collection(db, "user_profile"));

    let maleCount = 0,
      femaleCount = 0,
      otherCount = 0,
      totalVisitas = 0;
    let maleAges = [],
      femaleAges = [],
      otherAges = [];
    let tempAddressData = {},
      tempServiceData = {};
    let tempClientesData = [];
    // NUEVAS VARIABLES TEMPORALES
    let tempEmailData = {},
      tempBirthdayMonthData = {};
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

    let userGendersByEmail = {};

    querySnapshot.forEach((doc) => {
      const data = doc.data();

      if (data.gender) {
        const gender = data.gender.toLowerCase().trim();
        if (["hombre", "h", "male", "m", "masculino"].includes(gender)) {
          maleCount++;
          if (data.email)
            userGendersByEmail[data.email.toLowerCase().trim()] = "Hombres";
        } else if (["mujer", "f", "female", "femenino"].includes(gender)) {
          femaleCount++;
          if (data.email)
            userGendersByEmail[data.email.toLowerCase().trim()] = "Mujeres";
        } else {
          otherCount++;
          if (data.email)
            userGendersByEmail[data.email.toLowerCase().trim()] = "Otros";
        }
      }

      if (data.address)
        tempAddressData[data.address] =
          (tempAddressData[data.address] || 0) + 1;
      if (data.service)
        tempServiceData[data.service] =
          (tempServiceData[data.service] || 0) + 1;

      // EXTRAER CORREOS
      if (data.email) {
        const parts = data.email.split("@");
        if (parts.length === 2) {
          const domain = parts[1].toLowerCase().trim();
          tempEmailData[domain] = (tempEmailData[domain] || 0) + 1;
        }
      }

      // EXTRAER CUMPLEAÑOS
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

      let userVisitas = Number(data.visitas) || 0;
      let userPoints = Number(data.points) || 0;
      totalVisitas += userVisitas;

      let userName =
        data.name || data.email || "Usuario " + doc.id.substring(0, 5);
      if (userVisitas > 0 || userPoints > 0) {
        tempClientesData.push({
          name: userName,
          visitas: userVisitas,
          points: userPoints,
        });
      }
    });

    tempClientesData.sort((a, b) => b.visitas - a.visitas);
    const finalTopClientes = tempClientesData.slice(0, 15);

    const resSnapshot = await getDocs(collection(db, "reservations"));
    let totalReservations = 0;
    let tempResGenderData = {
      Mujeres: 0,
      Hombres: 0,
      Otros: 0,
      "No Identificado": 0,
    };

    resSnapshot.forEach((doc) => {
      const data = doc.data();
      totalReservations++;
      if (data.email) {
        const email = data.email.toLowerCase().trim();
        const matchedGender = userGendersByEmail[email];
        if (matchedGender) tempResGenderData[matchedGender]++;
        else tempResGenderData["No Identificado"]++;
      } else {
        tempResGenderData["No Identificado"]++;
      }
    });

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

    Object.keys(tempResGenderData).forEach((key) => {
      if (tempResGenderData[key] === 0) delete tempResGenderData[key];
    });

    const finalData = {
      maleCount,
      femaleCount,
      otherCount,
      totalUsers,
      totalVisitas,
      totalReservations,
      malePercentage:
        totalUsers > 0 ? ((maleCount / totalUsers) * 100).toFixed(1) : 0,
      femalePercentage:
        totalUsers > 0 ? ((femaleCount / totalUsers) * 100).toFixed(1) : 0,
      otherPercentage:
        totalUsers > 0 ? ((otherCount / totalUsers) * 100).toFixed(1) : 0,
      addressData: tempAddressData,
      ageData: tempAgeData,
      serviceData: tempServiceData,
      resGenderData: tempResGenderData,
      emailData: tempEmailData,
      birthdayMonthData: tempBirthdayMonthData,
      topClientesData: finalTopClientes,
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
  renderServiceChart();
  renderResGenderChart();
  renderAddressChart();
  renderAgeChart();
  renderEmailChart(); // RENDEREAR CORREOS
  renderBirthdayChart(); // RENDEREAR CUMPLEAÑOS
  renderClientesTable();
}

// FUNCIONES NUEVAS PARA RENDERIZAR
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

// FUNCIONES EXISTENTES
function renderResGenderChart() {
  const chart = document.getElementById("res-gender-chart");
  const loading = document.getElementById("loading-res-gender");
  if (Object.keys(resGenderData).length === 0) {
    loading.textContent = "No hay datos de reservaciones";
    return;
  }
  const sorted = Object.entries(resGenderData).sort((a, b) => b[1] - a[1]);
  chart.innerHTML = "";
  const maxCount = Math.max(...sorted.map((item) => item[1]));
  sorted.forEach(([genderGroup, count]) => {
    const width = (count / maxCount) * 100;
    const bar = document.createElement("div");
    bar.className = "chart-bar";
    bar.innerHTML = `<div class="bar-label"><strong>${genderGroup}</strong></div><div class="bar" style="width: ${width}%;"></div><div class="bar-count">${count}</div>`;
    chart.appendChild(bar);
  });
  loading.style.display = "none";
  chart.style.display = "flex";
}

function renderServiceChart() {
  const chart = document.getElementById("service-chart");
  const loading = document.getElementById("loading-service");
  if (Object.keys(serviceData).length === 0) {
    loading.textContent = "No hay datos disponibles";
    return;
  }
  const sorted = Object.entries(serviceData).sort((a, b) => b[1] - a[1]);
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
    loading.textContent = "No hay datos disponibles";
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

function renderClientesTable() {
  const container = document.getElementById("clientes-table-container");
  const tbody = document.querySelector("#clientes-table tbody");
  const loading = document.getElementById("loading-clientes");
  if (!topClientesData || topClientesData.length === 0) {
    loading.textContent = "No hay clientes con visitas registradas.";
    return;
  }
  tbody.innerHTML = "";
  const maxVisitas =
    topClientesData[0].visitas > 0 ? topClientesData[0].visitas : 1;
  topClientesData.forEach((user, index) => {
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
