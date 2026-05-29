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
let albumProgressData = []; // AHORA ES UN ARRAY PARA LA TABLA

const CACHE_KEY = "polloparatodos_dashboardData";
const TOTAL_ESTAMPAS_ALBUM = 121; // <-- Asegúrate de poner el total real de tu álbum

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
  document.getElementById("total-users").textContent = data.totalUsers;
  document.getElementById("promo-count").textContent = data.totalPromos || 0;
  document.getElementById("phone-count").textContent = data.phoneCount || 0;

  addressData = data.addressData;
  ageData = data.ageData;
  emailData = data.emailData || {};
  birthdayMonthData = data.birthdayMonthData || {};
  cpData = data.cpData || {};
  promoStatusData = data.promoStatusData || {};
  albumProgressData = data.albumProgressData || []; // Recibe el array de usuarios

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
      phoneCount = 0;
    let maleAges = [],
      femaleAges = [];
    let tempAddressData = {},
      tempEmailData = {},
      tempBirthdayMonthData = {},
      tempCpData = {};
    let tempAlbumProgressData = []; // Array temporal para los usuarios
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
      }

      if (data.address) {
        tempAddressData[data.address] =
          (tempAddressData[data.address] || 0) + 1;
        const cpMatch = String(data.address).match(/\b\d{5}\b/);
        const finalCp =
          data.cp ||
          data.codigoPostal ||
          data.zipcode ||
          (cpMatch ? cpMatch[0] : null);
        if (finalCp) tempCpData[finalCp] = (tempCpData[finalCp] || 0) + 1;
      }

      if (data.phone || data.telefono || data.whatsapp) phoneCount++;

      if (data.email) {
        const parts = data.email.split("@");
        if (parts.length === 2) {
          const domain = parts[1].toLowerCase().trim();
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
          }
        } catch (e) {}
      }

      // NUEVO: Recolección para la tabla de Top 15
      let userStamps = 0;

      // AHORA APUNTAMOS A LA ESTRUCTURA REAL:
      // Leemos albumCount directo de la raíz, o contamos los elementos en el arreglo album
      if (data.albumCount !== undefined) {
        userStamps = Number(data.albumCount);
      } else if (data.album && Array.isArray(data.album)) {
        userStamps = data.album.length;
      }

      // Evitamos que pase del 100% si hay algún error en BD
      if (userStamps > TOTAL_ESTAMPAS_ALBUM) userStamps = TOTAL_ESTAMPAS_ALBUM;

      // Priorizar el nombre, si no existe usar el apellido o el correo
      let userName =
        data.name ||
        data.nombre ||
        data.email ||
        "Usuario " + doc.id.substring(0, 5);

      // Si existe el apellido, lo concatenamos para que se vea más profesional
      if (data.surname) {
        userName = userName + " " + data.surname;
      }

      tempAlbumProgressData.push({
        name: userName,
        stamps: userStamps,
      });
    });

    // Ordenar de mayor a menor cantidad de estampas y extraer el top 15
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

    const finalData = {
      maleCount,
      femaleCount,
      totalUsers: maleCount + femaleCount,
      malePercentage:
        maleCount + femaleCount > 0
          ? ((maleCount / (maleCount + femaleCount)) * 100).toFixed(1)
          : 0,
      femalePercentage:
        maleCount + femaleCount > 0
          ? ((femaleCount / (maleCount + femaleCount)) * 100).toFixed(1)
          : 0,
      totalPromos,
      phoneCount,
      addressData: tempAddressData,
      ageData: {
        Hombres: parseFloat(maleAgeAvg),
        Mujeres: parseFloat(femaleAgeAvg),
        Total: parseFloat(totalAgeAvg),
      },
      emailData: tempEmailData,
      birthdayMonthData: tempBirthdayMonthData,
      cpData: tempCpData,
      promoStatusData: tempPromoStatusData,
      albumProgressData: top15Album, // Array con los 15 mejores
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
  renderAddressChart();
  renderAgeChart();
  renderEmailChart();
  renderBirthdayChart();
  renderPromoChart();
  renderAlbumTable(); // Llama a la nueva función de la tabla
}

// [Tus funciones renderAddressChart, renderAgeChart, renderEmailChart, renderBirthdayChart, renderCpChart y renderPromoChart quedan igual aquí]
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

function renderCpChart() {
  const chart = document.getElementById("cp-chart");
  const loading = document.getElementById("loading-cp");
  if (Object.keys(cpData).length === 0) {
    loading.textContent = "No hay datos de zonas";
    return;
  }
  const sorted = Object.entries(cpData)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10);
  chart.innerHTML = "";
  const maxCount = Math.max(...sorted.map((item) => item[1]));
  sorted.forEach(([cp, count]) => {
    const width = (count / maxCount) * 100;
    const bar = document.createElement("div");
    bar.className = "chart-bar";
    bar.innerHTML = `<div class="bar-label"><strong>CP ${cp}</strong></div><div class="bar" style="width: ${width}%;"></div><div class="bar-count">${count}</div>`;
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

// NUEVA FUNCIÓN: Dibuja la tabla Top 15 y calcula el porcentaje faltante
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

    // Calcular el avance para rellenar la barra interna de la tabla
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

// ==========================================
// NUEVA FUNCIÓN: EXPORTAR A PDF (Fix Definitivo)
// ==========================================
function exportToPDF() {
  const btn = document.getElementById("pdf-btn");
  const originalText = btn.innerHTML;
  btn.innerHTML = "⏳ Generando...";
  btn.disabled = true;

  // 1. TRUCO VITAL: Subir el scroll hasta arriba antes de capturar
  window.scrollTo(0, 0);

  // 2. Seleccionamos solo el main y activamos modo PDF
  const element = document.querySelector("main");
  document.body.classList.add("pdf-mode");

  // 3. Configuración del renderizador
  const opt = {
    margin: 0.4,
    filename: "Reporte_PolloParaTodos.pdf",
    image: { type: "jpeg", quality: 1 },
    html2canvas: {
      scale: 2,
      useCORS: true,
      backgroundColor: "#1e293b",
      scrollY: 0, // Fuerza a la librería a capturar desde el techo de la página
    },
    jsPDF: { unit: "in", format: "letter", orientation: "portrait" },
  };

  // 4. Generar el PDF
  html2pdf()
    .set(opt)
    .from(element)
    .save()
    .then(() => {
      document.body.classList.remove("pdf-mode");
      btn.innerHTML = originalText;
      btn.disabled = false;
    })
    .catch((err) => {
      console.error("Error al generar PDF:", err);
      updateStatus("Error al generar PDF", "error");
      document.body.classList.remove("pdf-mode");
      btn.innerHTML = originalText;
      btn.disabled = false;
    });
}

window.exportToPDF = exportToPDF;
