// Variables globales
let isConnected = false;
let lastUpdateTime = null;

// Inicializar la aplicación
function initApp() {
    console.log('Conectando directamente al servidor backend...');
    
    // Cargar datos directamente del servidor backend (datos reales de Firebase)
    loadDashboardData();
}

// Actualizar estado de conexión
function updateConnectionStatus(connected = isConnected) {
    const statusDot = document.getElementById('connection-status');
    const statusText = document.getElementById('status-text');
    
    if (connected) {
        statusDot.className = 'status-dot connected';
        statusText.textContent = 'Conectado al servidor';
    } else {
        statusDot.className = 'status-dot error';
        statusText.textContent = 'Error de conexión';
    }
}

// Cargar datos del dashboard
async function loadDashboardData() {
    try {
        console.log('=== Iniciando carga de datos ===');
        showLoading(true);
        
        // Intentar cargar datos del servidor backend (datos reales de Firebase)
        console.log('Conectando al servidor para obtener datos reales...');
        console.log('URL:', window.location.origin + '/api/stats');
        
        const response = await fetch('/api/stats');
        console.log('Respuesta del servidor:', response.status, response.statusText);
        
        if (response.ok) {
            const data = await response.json();
            console.log('=== Datos reales obtenidos del servidor ===');
            console.log('Datos:', data);
            
            updateStatistics(data);
            updateWeeklyChart(data.weeklyData);
            updateLastUpdateTime();
            isConnected = true;
            updateConnectionStatus(true);
            console.log('=== Dashboard actualizado correctamente ===');
        } else {
            throw new Error('Servidor no disponible: ' + response.status);
        }
        
        showLoading(false);
        
    } catch (error) {
        console.error('=== ERROR conectando al servidor ===');
        console.error('Detalles del error:', error);
        console.error('Tipo de error:', error.name);
        console.error('Mensaje:', error.message);
        
        // Mostrar mensaje de que necesita iniciar el servidor
        showError('⚠️ Servidor no disponible. Error: ' + error.message);
        updateConnectionStatus(false);
        showLoading(false);
        
        // No usar datos simulados, mostrar el error claramente
        document.getElementById('today-count').textContent = '?';
        document.getElementById('yesterday-count').textContent = '?';
        document.getElementById('total-count').textContent = '?';
    }
}

// Generar datos simulados basados en la información real que se ve en Firebase
function generateSimulatedData() {
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    
    // Datos exactos basados en lo que se ve en la consola de Firebase
    const userData = [
        // 10 agosto 2025 (hoy) - 9 registros
        { email: "nicolaslachoo2@gmail.com", date: "3 ago 2025" },
        { email: "miggarcio1049@gmail.com", date: "3 ago 2025" },
        { email: "claudiacarillome1@gmail.com", date: "3 ago 2025" },
        { email: "lamexicana1517@gmail.com", date: "3 ago 2025" },
        { email: "sequerrabrisma087@gmail.com", date: "2 ago 2025" },
        { email: "chelybanda@icloud.com", date: "1 ago 2025" },
        { email: "luislopezperenz2@gmail.com", date: "1 ago 2025" },
        { email: "mezaJorge25@hotmail.com", date: "1 ago 2025" },
        { email: "fabel.duron@basf.com", date: "1 ago 2025" },
        { email: "tere1184@gmail.com", date: "31 jul 2025" },
        { email: "marsuar121776@gmail.com", date: "31 jul 2025" },
        { email: "ladmonopn@gmail.com", date: "31 jul 2025" },
        { email: "cirugiaesteticaricc@yahoo.com", date: "31 jul 2025" },
        { email: "candyraygozt@yahoo.com", date: "31 jul 2025" },
        { email: "mortegitas@gmail.com", date: "30 jul 2025" },
        { email: "beckymag24@hotmail.com", date: "30 jul 2025" }
    ];
    
    // Simular conteo actual más realista
    const todayCount = 9; // Basado en actividad actual de hoy
    const yesterdayCount = 2; // Actividad de ayer
    const totalCount = 1247; // Total acumulado desde el inicio del programa
                             // (incluye todos los usuarios que se han registrado históricamente)
    const hotelCount = 15; // Número estimado de hoteles con registros
    
    // Generar datos semanales más realistas
    const weeklyData = generateRealisticWeeklyData();
    
    return {
        todayCount,
        yesterdayCount,
        totalCount,
        hotelCount,
        weeklyData
    };
}

// Generar datos semanales más realistas
function generateRealisticWeeklyData() {
    const days = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];
    const daysShort = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];
    const data = [];
    
    // Datos más realistas basados en patrones típicos
    // Los fines de semana suelen tener más actividad
    const weeklyValues = [4, 5, 3, 0, 0, 2, 9]; // Lun-Dom, con pico el domingo
    
    for (let i = 0; i < 7; i++) {
        data.push({
            day: daysShort[i],
            dayFull: days[i],
            count: weeklyValues[i],
            date: getDateForWeekDay(i),
            description: weeklyValues[i] === 0 ? 'Sin registros' : 
                        weeklyValues[i] === 1 ? '1 usuario nuevo' : 
                        `${weeklyValues[i]} usuarios nuevos`
        });
    }
    
    return data;
}

// Obtener fecha para día de la semana
function getDateForWeekDay(dayIndex) {
    const today = new Date();
    const currentDay = today.getDay() === 0 ? 7 : today.getDay(); // Convertir domingo de 0 a 7
    const diff = dayIndex + 1 - currentDay;
    const targetDate = new Date(today);
    targetDate.setDate(today.getDate() + diff);
    
    return targetDate.toLocaleDateString('es-ES', { 
        day: '2-digit', 
        month: '2-digit' 
    });
}

// Actualizar estadísticas principales
function updateStatistics(data) {
    document.getElementById('today-count').textContent = data.todayCount;
    document.getElementById('yesterday-count').textContent = data.yesterdayCount;
    document.getElementById('total-count').textContent = data.totalCount;
    document.getElementById('hotel-count').textContent = data.hotelCount || '?';
    
    // Actualizar fechas
    const today = new Date().toLocaleDateString('es-ES', { 
        weekday: 'long', 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
    });
    
    const yesterday = new Date(Date.now() - 86400000).toLocaleDateString('es-ES', { 
        weekday: 'long', 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
    });
    
    document.getElementById('today-date').textContent = today;
    document.getElementById('yesterday-date').textContent = yesterday;
}

// Función auxiliar para obtener nombre completo del día
function getDayName(dayShort) {
    const dayMap = {
        'Lun': 'Lunes',
        'Mar': 'Martes', 
        'Mié': 'Miércoles',
        'Jue': 'Jueves',
        'Vie': 'Viernes',
        'Sáb': 'Sábado',
        'Dom': 'Domingo'
    };
    return dayMap[dayShort] || dayShort;
}

// Actualizar gráfico semanal
function updateWeeklyChart(weeklyData) {
    const chartContainer = document.getElementById('weekly-chart');
    chartContainer.innerHTML = '';
    
    const maxCount = Math.max(...weeklyData.map(d => d.count), 1);
    
    weeklyData.forEach(dayData => {
        const barContainer = document.createElement('div');
        barContainer.className = 'chart-bar';
        
        const height = (dayData.count / maxCount) * 100;
        barContainer.style.height = height + '%';
        barContainer.style.minHeight = '10px';
        
        const barValue = document.createElement('div');
        barValue.className = 'bar-value';
        barValue.textContent = dayData.count === 0 ? 'Sin registros' : 
                              dayData.count === 1 ? '1 registro' : 
                              `${dayData.count} registros`;
        
        const barLabel = document.createElement('div');
        barLabel.className = 'bar-label';
        // Usar dayFull si existe, si no, usar day o el índice para generar el nombre
        const dayName = dayData.dayFull || getDayName(dayData.day) || dayData.day;
        barLabel.innerHTML = `<strong>${dayName}</strong><br><small>${dayData.date}</small>`;
        
        barContainer.appendChild(barValue);
        barContainer.appendChild(barLabel);
        chartContainer.appendChild(barContainer);
    });
    
    chartContainer.style.display = 'flex';
}

// Mostrar/ocultar loading
function showLoading(show) {
    const loading = document.getElementById('loading');
    const chart = document.getElementById('weekly-chart');
    
    if (show) {
        loading.style.display = 'block';
        chart.style.display = 'none';
    } else {
        loading.style.display = 'none';
    }
}

// Mostrar error
function showError(message) {
    const loading = document.getElementById('loading');
    loading.textContent = message;
    loading.style.color = '#e74c3c';
}

// Actualizar tiempo de última actualización
function updateLastUpdateTime() {
    const now = new Date();
    lastUpdateTime = now;
    document.getElementById('last-update').textContent = now.toLocaleString('es-ES');
}

// Refrescar datos
function refreshData() {
    console.log('Refrescando datos...');
    loadDashboardData();
}

// Buscar usuarios por hotel ID
async function searchHotel() {
    const hotelId = document.getElementById('hotel-search-input').value.trim();
    const resultElement = document.getElementById('hotel-result');
    const labelElement = document.getElementById('hotel-label');
    const searchBtn = document.getElementById('hotel-search-btn');
    
    if (!hotelId) {
        resultElement.textContent = '?';
        labelElement.textContent = 'usuarios registrados';
        return;
    }
    
    // Mostrar estado de carga
    searchBtn.textContent = '⏳';
    searchBtn.disabled = true;
    resultElement.textContent = '...';
    
    try {
        const response = await fetch(`/api/hotel-users/${encodeURIComponent(hotelId)}`);
        
        if (response.ok) {
            const data = await response.json();
            resultElement.textContent = data.userCount;
            labelElement.textContent = `usuarios del hotel "${hotelId}"`;
        } else {
            throw new Error('Error del servidor');
        }
        
    } catch (error) {
        console.error('Error buscando hotel:', error);
        resultElement.textContent = '?';
        labelElement.textContent = 'Error en la búsqueda';
    } finally {
        searchBtn.textContent = '🔍';
        searchBtn.disabled = false;
    }
}

// Permitir búsqueda con Enter
document.addEventListener('DOMContentLoaded', function() {
    console.log('Página cargada, inicializando dashboard...');
    
    // Agregar listener para Enter en el campo de búsqueda
    const searchInput = document.getElementById('hotel-search-input');
    if (searchInput) {
        searchInput.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') {
                searchHotel();
            }
        });
    }
    
    initApp();
});

// Auto-refresh cada 5 minutos
setInterval(() => {
    if (isConnected) {
        loadDashboardData();
    }
}, 5 * 60 * 1000);

// Función para implementar cuando tengas acceso real a Firebase
async function loadRealFirebaseData() {
    /* 
    Código para implementar cuando configures Firebase correctamente:
    
    try {
        // Obtener usuarios registrados hoy
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        const todayUsers = await db.collection('users')
            .where('createdAt', '>=', today)
            .get();
        
        // Obtener usuarios registrados ayer
        const yesterday = new Date(today);
        yesterday.setDate(yesterday.getDate() - 1);
        
        const yesterdayUsers = await db.collection('users')
            .where('createdAt', '>=', yesterday)
            .where('createdAt', '<', today)
            .get();
        
        // Total de usuarios
        const totalUsers = await db.collection('users').get();
        
        const data = {
            todayCount: todayUsers.size,
            yesterdayCount: yesterdayUsers.size,
            totalCount: totalUsers.size,
            weeklyData: await getWeeklyData()
        };
        
        return data;
        
    } catch (error) {
        console.error('Error obteniendo datos de Firebase:', error);
        throw error;
    }
    */
}
