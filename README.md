# Dashboard Plan de Lealtad

Una página web sencilla que muestra el conteo diario de registros en tu plan de lealtad usando Firebase.

## 🚀 Características

- ✅ Conteo de registros de hoy
- ✅ Conteo de registros de ayer  
- ✅ Total de usuarios registrados
- ✅ Gráfico de registros de los últimos 7 días
- ✅ Actualización en tiempo real
- ✅ Diseño responsive
- ✅ Interfaz moderna y atractiva

## 📋 Requisitos

- Proyecto de Firebase configurado
- Acceso a Firebase Authentication
- Navegador web moderno

## 🛠️ Configuración

### Paso 1: Configurar Firebase Web App

1. Ve a la [Consola de Firebase](https://console.firebase.google.com/)
2. Selecciona tu proyecto: **plan-de-lealtad-5cbd9**
3. En el panel izquierdo, ve a "Configuración del proyecto" (icono de engranaje)
4. En la sección "Tus apps", haz clic en "Agregar app" y selecciona "Web" (</>) 
5. Registra tu app con un nombre como "Dashboard Plan de Lealtad"
6. Copia la configuración que se muestra

### Paso 2: Actualizar config.js

Reemplaza la configuración en `config.js` con la que obtuviste de Firebase:

```javascript
const firebaseConfig = {
  apiKey: "tu-api-key-aqui",
  authDomain: "plan-de-lealtad-5cbd9.firebaseapp.com",
  projectId: "plan-de-lealtad-5cbd9",
  storageBucket: "plan-de-lealtad-5cbd9.appspot.com",
  messagingSenderId: "100848900872851840577",
  appId: "tu-app-id-aqui"
};
```

### Paso 3: Configurar Reglas de Firestore (si usas Firestore)

Si almacenas los usuarios en Firestore, configura las reglas:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /users/{document} {
      allow read: if true; // Permitir lectura para el dashboard
      allow write: if false; // Solo escritura desde el servidor
    }
  }
}
```

### Paso 4: Configurar Firebase Authentication (Opcional)

Si quieres restringir el acceso al dashboard:

1. Ve a Authentication en la consola de Firebase
2. Habilita el método de autenticación que prefieras
3. Agrega usuarios autorizados

## 📁 Estructura del Proyecto

```
GourmeTCardActu/
├── index.html          # Página principal
├── style.css           # Estilos
├── config.js           # Configuración de Firebase
├── app.js              # Lógica de la aplicación
└── README.md           # Este archivo
```

## 🔧 Uso

1. **Desarrollo Local**: Simplemente abre `index.html` en tu navegador
2. **Servidor Web**: Sube los archivos a tu servidor web preferido
3. **GitHub Pages**: Sube a un repositorio y activa GitHub Pages

## 📊 Datos Mostrados

### Estadísticas Principales
- **Registros Hoy**: Usuarios que se registraron hoy
- **Registros Ayer**: Usuarios que se registraron ayer
- **Total Usuarios**: Número total de usuarios registrados

### Gráfico Semanal
- Muestra los registros de los últimos 7 días
- Actualización automática cada 5 minutos
- Interactivo con tooltips

## 🎨 Personalización

### Cambiar Colores
Modifica las variables CSS en `style.css`:

```css
:root {
  --primary-color: #667eea;
  --secondary-color: #764ba2;
  --success-color: #4CAF50;
  --info-color: #2196F3;
  --warning-color: #FF9800;
}
```

### Agregar Más Estadísticas
Puedes agregar nuevas tarjetas de estadísticas modificando `index.html` y `app.js`.

## 🔒 Seguridad

**IMPORTANTE**: El archivo actual incluye credenciales de service account solo para demostración. Para producción:

1. ❌ **NO** uses service account credentials en el frontend
2. ✅ **USA** la configuración web de Firebase
3. ✅ **CONFIGURA** reglas de seguridad apropiadas
4. ✅ **IMPLEMENTA** autenticación si es necesario

## 🚀 Despliegue

### Opción 1: GitHub Pages
1. Sube el código a un repositorio de GitHub
2. Ve a Settings → Pages
3. Selecciona la rama main como fuente

### Opción 2: Netlify
1. Arrastra la carpeta del proyecto a [Netlify Drop](https://app.netlify.com/drop)
2. Tu sitio estará disponible inmediatamente

### Opción 3: Firebase Hosting
```bash
npm install -g firebase-tools
firebase login
firebase init hosting
firebase deploy
```

## 🐛 Solución de Problemas

### Error de CORS
Si ves errores de CORS, necesitas servir los archivos desde un servidor web, no abrirlos directamente en el navegador.

### Datos no se cargan
1. Verifica que la configuración de Firebase sea correcta
2. Revisa la consola del navegador para errores
3. Asegúrate de que las reglas de Firestore permitan lectura

### Problema de conexión
El indicador de estado te mostrará si hay problemas de conexión con Firebase.

## 📱 Responsive

El dashboard es completamente responsive y se ve bien en:
- 📱 Móviles (320px+)
- 📱 Tablets (768px+) 
- 💻 Desktops (1024px+)

## 🔄 Actualizaciones Automáticas

- Los datos se actualizan automáticamente cada 5 minutos
- Puedes forzar una actualización con el botón "🔄 Actualizar"
- El estado de conexión se muestra en tiempo real

## 📧 Soporte

Si tienes problemas con la configuración, revisa:
1. La consola de Firebase para errores
2. La consola del navegador para logs
3. Las reglas de seguridad de Firebase

---

¡Disfruta de tu nuevo dashboard! 🎉
