import { db } from "./firebase-config.js";
import {
  collection,
  getDocs,
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

let addressData = {};
let ageData = {};
let emailData = {};
let birthdayMonthData = {};
let cpData = {};
let promoStatusData = {};
let companyData = {};
let albumProgressData = [];
let referData = {};

const CACHE_KEY = "polloparatodos_dashboardData";
const TOTAL_ESTAMPAS_ALBUM = 121;

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
  document.getElementById("promo-count").textContent = data.totalPromos || 0;

  addressData = data.addressData || {};
  ageData = data.ageData || {};
  emailData = data.emailData || {};
  birthdayMonthData = data.birthdayMonthData || {};
  cpData = data.cpData || {};
  promoStatusData = data.promoStatusData || {};
  companyData = data.companyData || {};
  albumProgressData = data.albumProgressData || [];
  referData = data.referData || {};

  renderCharts();

  const lastUpdateDate = new Date(data.lastUpdateTimestamp);
  document.getElementById("last-update").textContent =
    lastUpdateDate.toLocaleString("es-MX");
}

async function fetchUserDataFromFirestore() {
  try {
    updateStatus("Conectando y descargando datos...", "connected");

    const userQuerySnapshot = await getDocs(collection(db, "user_profile"));
    let maleCount = 0,
      femaleCount = 0,
      otherCount = 0,
      phoneCount = 0;
    let maleAges = [],
      femaleAges = [],
      otherAges = [];

    let tempAddressData = {},
      tempEmailData = {},
      tempBirthdayMonthData = {},
      tempCpData = {};
    let tempAlbumProgressData = [];
    let tempReferData = {};

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

    userQuerySnapshot.forEach((doc) => {
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
      if (data.phone || data.telefono || data.whatsapp) phoneCount++;
      if (data.email) {
        const parts = data.email.split("@");
        if (parts.length === 2) {
          const domain = parts[1].toLowerCase().trim();
          tempEmailData[domain] = (tempEmailData[domain] || 0) + 1;
        }
      }

      // EXTRACCIÓN DE REFERIDOS CON FILTRO
      if (data.refer) {
        const referrer = data.refer.trim();
        const referrerLower = referrer.toLowerCase();

        // Ignoramos campos vacíos y a los "No referidos"
        if (
          referrer !== "" &&
          referrerLower !== "no referido" &&
          referrerLower !== "noreferido" &&
          referrerLower !== "none" &&
          referrerLower !== "n/a"
        ) {
          tempReferData[referrer] = (tempReferData[referrer] || 0) + 1;
        }
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
            const genderLower = data.gender
              ? data.gender.toLowerCase().trim()
              : "";
            if (["hombre", "h", "male", "m", "masculino"].includes(genderLower))
              maleAges.push(age);
            else if (["mujer", "f", "female", "femenino"].includes(genderLower))
              femaleAges.push(age);
            else otherAges.push(age);
          }
        } catch (e) {}
      }

      let userStamps = 0;
      if (data.albumCount !== undefined) {
        userStamps = Number(data.albumCount);
      } else if (data.album && Array.isArray(data.album)) {
        userStamps = data.album.length;
      }
      if (userStamps > TOTAL_ESTAMPAS_ALBUM) userStamps = TOTAL_ESTAMPAS_ALBUM;

      let userName =
        data.name ||
        data.nombre ||
        data.email ||
        "Usuario " + doc.id.substring(0, 5);
      if (data.surname) userName = userName + " " + data.surname;

      tempAlbumProgressData.push({ name: userName, stamps: userStamps });
    });

    tempAlbumProgressData.sort((a, b) => b.stamps - a.stamps);
    const top15Album = tempAlbumProgressData.slice(0, 15);

    const promoQuerySnapshot = await getDocs(collection(db, "promotion"));
    let totalPromos = 0;
    let tempPromoStatusData = {};
    promoQuerySnapshot.forEach((doc) => {
      const data = doc.data();
      totalPromos++;
      if (data.status) {
        const status =
          data.status.charAt(0).toUpperCase() +
          data.status.slice(1).toLowerCase();
        tempPromoStatusData[status] = (tempPromoStatusData[status] || 0) + 1;
      }
    });

    const sucursalesSnapshot = await getDocs(collection(db, "sucursales"));
    let tempCompanyData = {};
    sucursalesSnapshot.forEach((doc) => {
      const data = doc.data();
      const branchName = data.nombre ? data.nombre.toLowerCase() : "";
      let companyName = "Otras / Independientes";

      if (branchName.includes("pollo feliz")) companyName = "Pollo Feliz";
      else if (branchName.includes("bachoco")) companyName = "Bachoco";
      else if (branchName.includes("molino")) companyName = "El Molino";
      else if (branchName.includes("trigon")) companyName = "Trigon";
      else if (branchName.includes("sabropollo")) companyName = "Sabropollo";

      tempCompanyData[companyName] = (tempCompanyData[companyName] || 0) + 1;
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

    const ageDataObject = {
      Hombres: parseFloat(maleAgeAvg),
      Mujeres: parseFloat(femaleAgeAvg),
    };
    if (parseFloat(otherAgeAvg) > 0)
      ageDataObject["Otros"] = parseFloat(otherAgeAvg);
    ageDataObject["Total"] = parseFloat(totalAgeAvg);

    const finalData = {
      maleCount,
      femaleCount,
      otherCount,
      totalUsers,
      malePercentage:
        totalUsers > 0 ? ((maleCount / totalUsers) * 100).toFixed(1) : 0,
      femalePercentage:
        totalUsers > 0 ? ((femaleCount / totalUsers) * 100).toFixed(1) : 0,
      otherPercentage:
        totalUsers > 0 ? ((otherCount / totalUsers) * 100).toFixed(1) : 0,
      totalPromos,
      phoneCount,
      addressData: tempAddressData,
      ageData: ageDataObject,
      emailData: tempEmailData,
      birthdayMonthData: tempBirthdayMonthData,
      promoStatusData: tempPromoStatusData,
      companyData: tempCompanyData,
      albumProgressData: top15Album,
      referData: tempReferData,
      lastUpdateTimestamp: new Date().toISOString(),
    };

    localStorage.setItem(CACHE_KEY, JSON.stringify(finalData));
    updateUI(finalData);
    updateStatus("Datos actualizados desde Firestore", "connected");
  } catch (error) {
    console.error("Error al obtener datos:", error);
    updateStatus("Error al conectar", "error");
  }
}

function renderCharts() {
  renderCompanyChart();
  renderReferChart();
  renderAddressChart();
  renderAgeChart();
  renderEmailChart();
  renderBirthdayChart();
  renderPromoChart();
  renderAlbumTable();
}

function renderReferChart() {
  const chart = document.getElementById("refer-chart");
  const loading = document.getElementById("loading-refer");

  if (Object.keys(referData).length === 0) {
    loading.textContent = "No hay datos de referidos";
    return;
  }

  const sorted = Object.entries(referData)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10);
  chart.innerHTML = "";
  const maxCount = Math.max(...sorted.map((item) => item[1]));

  sorted.forEach(([referrer, count]) => {
    const width = (count / maxCount) * 100;
    const bar = document.createElement("div");
    bar.className = "chart-bar";
    bar.innerHTML = `<div class="bar-label"><strong>${referrer}</strong></div><div class="bar" style="width: ${width}%;"></div><div class="bar-count">${count}</div>`;
    chart.appendChild(bar);
  });

  loading.style.display = "none";
  chart.style.display = "flex";
}

function renderCompanyChart() {
  const chart = document.getElementById("company-chart");
  const loading = document.getElementById("loading-company");
  if (Object.keys(companyData).length === 0) {
    loading.textContent = "No hay datos de sucursales";
    return;
  }
  const sorted = Object.entries(companyData).sort((a, b) => b[1] - a[1]);
  chart.innerHTML = "";
  const maxCount = Math.max(...sorted.map((item) => item[1]));
  sorted.forEach(([company, count]) => {
    const width = (count / maxCount) * 100;
    const bar = document.createElement("div");
    bar.className = "chart-bar";
    bar.innerHTML = `<div class="bar-label"><strong>${company}</strong></div><div class="bar" style="width: ${width}%;"></div><div class="bar-count">${count}</div>`;
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

function renderPromoChart() {
  const chart = document.getElementById("promo-chart");
  const loading = document.getElementById("loading-promo");
  if (Object.keys(promoStatusData).length === 0) {
    loading.textContent = "No hay datos de promociones";
    return;
  }
  const sorted = Object.entries(promoStatusData).sort((a, b) => b[1] - a[1]);
  chart.innerHTML = "";
  const maxCount = Math.max(...sorted.map((item) => item[1]));
  sorted.forEach(([status, count]) => {
    const width = (count / maxCount) * 100;
    const bar = document.createElement("div");
    bar.className = "chart-bar";
    bar.innerHTML = `<div class="bar-label"><strong>${status}</strong></div><div class="bar" style="width: ${width}%;"></div><div class="bar-count">${count}</div>`;
    chart.appendChild(bar);
  });
  loading.style.display = "none";
  chart.style.display = "flex";
}

function renderAlbumTable() {
  const container = document.getElementById("album-table-container");
  const tbody = document.querySelector("#album-table tbody");
  const loading = document.getElementById("loading-album");
  if (!albumProgressData || albumProgressData.length === 0) {
    loading.textContent = "No hay datos suficientes para el ranking.";
    return;
  }
  tbody.innerHTML = "";
  albumProgressData.forEach((user, index) => {
    let faltantes = TOTAL_ESTAMPAS_ALBUM - user.stamps;
    let porcentajeFalta = ((faltantes / TOTAL_ESTAMPAS_ALBUM) * 100).toFixed(1);
    if (porcentajeFalta < 0) porcentajeFalta = 0;
    let porcentajeAvance = 100 - porcentajeFalta;
    const tr = document.createElement("tr");
    tr.innerHTML = `
          <td><strong>#${index + 1}</strong> ${user.name}</td>
          <td><span class="badge-stamps">${user.stamps} / ${TOTAL_ESTAMPAS_ALBUM}</span></td>
          <td>
              <div class="progress-wrapper">
                  <span class="pct-text">${porcentajeFalta}%</span>
                  <div class="progress-bar-bg">
                      <div class="progress-bar-fill" style="width: ${porcentajeAvance}%;"></div>
                  </div>
              </div>
          </td>
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
