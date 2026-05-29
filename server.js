const express = require("express");
const admin = require("firebase-admin");
const cors = require("cors");
require("dotenv").config();

const app = express();
const port = process.env.PORT || 3000;

// Configurar CORS
app.use(cors());
app.use(express.json());

// Inicializar Firebase Admin
const serviceAccount = {
  type: "service_account",
  project_id: process.env.FIREBASE_PROJECT_ID,
  private_key: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, "\n"),
  client_email: process.env.FIREBASE_CLIENT_EMAIL,
};

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  projectId: process.env.FIREBASE_PROJECT_ID,
});

const auth = admin.auth();
const db = admin.firestore();

// --- Nuevo: calcular estadísticas a través de todas las páginas de auth.listUsers()
async function computeAuthStats() {
  const now = new Date();
  const todayStart = new Date(now);
  todayStart.setHours(0, 0, 0, 0);
  const sixDaysAgoStart = new Date(todayStart);
  sixDaysAgoStart.setDate(sixDaysAgoStart.getDate() - 6);
  const yesterdayStart = new Date(todayStart);
  yesterdayStart.setDate(yesterdayStart.getDate() - 1);

  let nextPageToken = undefined;
  let totalCount = 0;
  let todayCount = 0;
  let yesterdayCount = 0;
  const weeklyCounts = new Array(7).fill(0); // index 0 = hace 6 días ... index 6 = hoy

  do {
    const result = await auth.listUsers(1000, nextPageToken);
    const usersPage = result.users || [];
    usersPage.forEach((user) => {
      const userDate = new Date(user.metadata.creationTime);
      totalCount++;
      if (userDate >= todayStart) todayCount++;
      if (userDate >= yesterdayStart && userDate < todayStart) yesterdayCount++;
      if (
        userDate >= sixDaysAgoStart &&
        userDate <= new Date(todayStart.getTime() + 24 * 60 * 60 * 1000 - 1)
      ) {
        const idx = Math.floor(
          (userDate - sixDaysAgoStart) / (24 * 60 * 60 * 1000),
        );
        if (idx >= 0 && idx < 7) weeklyCounts[idx]++;
      }
    });
    nextPageToken = result.pageToken || result.nextPageToken;
  } while (nextPageToken);

  // Construir weeklyData en el mismo formato que antes
  const days = [
    "Domingo",
    "Lunes",
    "Martes",
    "Miércoles",
    "Jueves",
    "Viernes",
    "Sábado",
  ];
  const daysShort = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];
  const weeklyData = [];
  for (let i = 0; i < 7; i++) {
    const date = new Date(sixDaysAgoStart);
    date.setDate(date.getDate() + i);
    weeklyData.push({
      day: daysShort[date.getDay()],
      dayFull: days[date.getDay()],
      count: weeklyCounts[i],
      date: date.toLocaleDateString("es-ES", {
        day: "2-digit",
        month: "2-digit",
      }),
      fullDate: date.toISOString().split("T")[0],
    });
  }

  return { totalCount, todayCount, yesterdayCount, weeklyData };
}
// --- Fin nuevo

// Endpoint para obtener estadísticas de usuarios
app.get("/api/stats", async (req, res) => {
  try {
    console.log("Obteniendo estadísticas de usuarios y hoteles...");

    // Usar paginación para obtener conteos correctos de Authentication
    const { totalCount, todayCount, yesterdayCount, weeklyData } =
      await computeAuthStats();

    // Obtener perfiles de usuarios desde Firestore para datos de hoteles
    let hotelCount = 0;
    try {
      const userProfilesRef = db.collection("user_profile");
      const userProfilesSnapshot = await userProfilesRef.get();

      // Contar hoteles únicos
      const hotelIds = new Set();
      userProfilesSnapshot.forEach((doc) => {
        const data = doc.data();
        if (data.hotelId && data.hotelId.trim() !== "") {
          hotelIds.add(data.hotelId);
        }
      });

      hotelCount = hotelIds.size;
      console.log(
        `Encontrados ${hotelCount} hoteles únicos en ${userProfilesSnapshot.size} perfiles`,
      );
    } catch (firestoreError) {
      console.log("Error accediendo a Firestore:", firestoreError.message);
      hotelCount = 12;
    }

    const stats = {
      todayCount: todayCount,
      yesterdayCount: yesterdayCount,
      totalCount: totalCount,
      hotelCount: hotelCount,
      weeklyData: weeklyData,
      lastUpdate: new Date().toISOString(),
    };

    console.log("Estadísticas generadas:", stats);
    res.json(stats);
  } catch (error) {
    console.error("Error obteniendo estadísticas:", error);
    res.status(500).json({
      error: "Error obteniendo estadísticas",
      message: error.message,
    });
  }
});

// Endpoint para buscar usuarios por hotel ID
app.get("/api/hotel-users/:hotelId", async (req, res) => {
  try {
    const { hotelId } = req.params;
    console.log(`Buscando usuarios del hotel: ${hotelId}`);

    if (!hotelId || hotelId.trim() === "") {
      return res.status(400).json({
        error: "Hotel ID es requerido",
        userCount: 0,
      });
    }

    try {
      // Buscar en Firestore los perfiles de usuario con este hotelId
      const userProfilesRef = db.collection("user_profile");
      const query = userProfilesRef.where("hotelId", "==", hotelId.trim());
      const querySnapshot = await query.get();

      const userCount = querySnapshot.size;

      console.log(`Encontrados ${userCount} usuarios para el hotel ${hotelId}`);

      // Opcional: obtener detalles de los usuarios (sin datos sensibles)
      const users = [];
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        users.push({
          name: data.name || "Sin nombre",
          email: data.email || "Sin email",
          // No incluir datos sensibles como password
        });
      });

      res.json({
        hotelId: hotelId,
        userCount: userCount,
        users: users.slice(0, 5), // Solo los primeros 5 para no sobrecargar
        message:
          userCount === 0
            ? `No se encontraron usuarios para el hotel ${hotelId}`
            : `Se encontraron ${userCount} usuarios para el hotel ${hotelId}`,
      });
    } catch (firestoreError) {
      console.log("Error accediendo a Firestore:", firestoreError.message);

      // Si no se puede acceder a Firestore, devolver error
      res.status(503).json({
        error: "No se puede acceder a la base de datos de hoteles",
        userCount: 0,
        message: "Servicio temporalmente no disponible",
      });
    }
  } catch (error) {
    console.error("Error en búsqueda de hotel:", error);
    res.status(500).json({
      error: "Error interno del servidor",
      userCount: 0,
      message: error.message,
    });
  }
});

// Función para generar estadísticas semanales
function generateWeeklyStats(users) {
  const days = [
    "Domingo",
    "Lunes",
    "Martes",
    "Miércoles",
    "Jueves",
    "Viernes",
    "Sábado",
  ];
  const daysShort = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];
  const weeklyData = [];

  for (let i = 6; i >= 0; i--) {
    const date = new Date();
    date.setDate(date.getDate() - i);

    const dayStart = new Date(date);
    dayStart.setHours(0, 0, 0, 0);

    const dayEnd = new Date(date);
    dayEnd.setHours(23, 59, 59, 999);

    const dayUsers = users.filter((user) => {
      const userDate = new Date(user.metadata.creationTime);
      return userDate >= dayStart && userDate <= dayEnd;
    });

    weeklyData.push({
      day: daysShort[date.getDay()],
      dayFull: days[date.getDay()],
      count: dayUsers.length,
      date: date.toLocaleDateString("es-ES", {
        day: "2-digit",
        month: "2-digit",
      }),
      fullDate: date.toISOString().split("T")[0],
    });
  }

  return weeklyData;
}

// Endpoint para obtener los top 10 hoteles
app.get("/api/top-hotels", async (req, res) => {
  try {
    console.log("=== ENDPOINT TOP HOTELS LLAMADO ===");
    console.log("Obteniendo top 10 hoteles...");

    const userProfilesRef = db.collection("user_profile");
    const userProfilesSnapshot = await userProfilesRef.get();
    console.log(`Documentos encontrados: ${userProfilesSnapshot.size}`);

    // Contar usuarios por hotel
    const hotelCounts = {};
    userProfilesSnapshot.forEach((doc) => {
      const data = doc.data();
      if (data.hotelId && data.hotelId.trim() !== "") {
        const hotelId = data.hotelId.trim();
        hotelCounts[hotelId] = (hotelCounts[hotelId] || 0) + 1;
      }
    });

    console.log(`Hoteles contados: ${Object.keys(hotelCounts).length}`);

    // Convertir a array y ordenar
    const sortedHotels = Object.entries(hotelCounts)
      .map(([hotelId, count]) => ({ hotelId, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10); // Top 10

    console.log(`Top 10 hoteles:`, sortedHotels);
    res.json({ topHotels: sortedHotels });
  } catch (error) {
    console.error("Error obteniendo top hoteles:", error);
    res.status(500).json({
      error: "Error obteniendo top hoteles",
      message: error.message,
    });
  }
});

// Endpoint de salud
app.get("/health", (req, res) => {
  res.json({ status: "OK", timestamp: new Date().toISOString() });
});

// Servir archivos estáticos (para el frontend)
// Cambiado para usar gc.html como index por defecto
app.use(express.static("."));

// Iniciar servidor
app.listen(port, () => {
  console.log(`Servidor ejecutándose en http://localhost:${port}`);
  console.log(`Dashboard disponible en http://localhost:${port}`);
});

module.exports = app;
