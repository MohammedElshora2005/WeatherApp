const apiKey = "c1a14f77cc7a352ed771c1b35bba091d";
let currentUnit = "metric";
let currentCity = "Cairo";
let autoRefreshInterval = null;
let currentMap = null;
let favoriteCities = JSON.parse(localStorage.getItem("favoriteCities")) || ["Cairo", "Alexandria", "London"];

document.addEventListener("DOMContentLoaded", () => {
  initEventListeners();
  loadFavorites();
  getWeatherData(currentCity);
  updateWeatherForFavorites();
  updateMap(currentCity);
  
  if (localStorage.getItem("darkMode") === "light") {
    document.body.classList.add("light-mode");
    document.getElementById("themeToggle").innerHTML = '<i class="fas fa-sun"></i>';
  }
  
  if (localStorage.getItem("autoRefresh") === "true") {
    document.getElementById("autoRefreshCheck").checked = true;
    startAutoRefresh();
  }
});

function initEventListeners() {
  document.getElementById("searchBtn").addEventListener("click", () => {
    const city = document.getElementById("cityInput").value.trim();
    if (city) {
      currentCity = city;
      getWeatherData(city);
      updateMap(city);
      document.getElementById("cityInput").value = "";
    }
  });
  
  document.getElementById("cityInput").addEventListener("keypress", (e) => {
    if (e.key === "Enter") {
      document.getElementById("searchBtn").click();
    }
  });
  
  document.getElementById("currentLocationBtn").addEventListener("click", getCurrentLocation);
  document.getElementById("refreshAllBtn").addEventListener("click", refreshAll);
  document.getElementById("themeToggle").addEventListener("click", toggleTheme);
  document.getElementById("celsiusBtn").addEventListener("click", () => changeUnit("metric"));
  document.getElementById("fahrenheitBtn").addEventListener("click", () => changeUnit("imperial"));
  document.getElementById("autoRefreshCheck").addEventListener("change", toggleAutoRefresh);
  document.getElementById("addToFavoritesBtn").addEventListener("click", addCurrentCityToFavorites);
}

async function getWeatherData(city, showNotification = true) {
  try {
    const response = await fetch(`https://api.openweathermap.org/data/2.5/weather?q=${city}&appid=${apiKey}&units=${currentUnit}`);
    const data = await response.json();
    
    if (data.cod !== 200) {
      showMessage(`❌ City "${city}" not found`, "error");
      return;
    }
    
    displayCurrentWeather(data);
    
    const forecastResponse = await fetch(`https://api.openweathermap.org/data/2.5/forecast?q=${city}&appid=${apiKey}&units=${currentUnit}`);
    const forecastData = await forecastResponse.json();
    displayForecast(forecastData);
    calculateStatistics(forecastData);
    
    if (showNotification) {
      showMessage(`✅ Weather updated for ${data.name}`, "success");
    }
    
    return data;
  } catch (error) {
    console.error("Error:", error);
    showMessage("⚠️ Failed to fetch weather data", "error");
  }
}

function displayCurrentWeather(data) {
  const temp = Math.round(data.main.temp);
  const feelsLike = Math.round(data.main.feels_like);
  const icon = getWeatherIcon(data.weather[0].main);
  const unitSymbol = currentUnit === "metric" ? "C" : "F";
  const windUnit = currentUnit === "metric" ? "m/s" : "mph";
  
  const html = `
    <div class="weather-main">
      <div class="weather-icon">${icon}</div>
      <div class="temperature">${temp}°${unitSymbol}</div>
      <div class="city">${data.name}, ${data.sys.country}</div>
      <div class="description">${data.weather[0].description}</div>
    </div>
    <div class="weather-details">
      <div class="detail-card">
        <i class="fas fa-thermometer-half"></i>
        <div class="detail-label">Feels Like</div>
        <div class="detail-value">${feelsLike}°${unitSymbol}</div>
      </div>
      <div class="detail-card">
        <i class="fas fa-tint"></i>
        <div class="detail-label">Humidity</div>
        <div class="detail-value">${data.main.humidity}%</div>
      </div>
      <div class="detail-card">
        <i class="fas fa-wind"></i>
        <div class="detail-label">Wind Speed</div>
        <div class="detail-value">${data.wind.speed} ${windUnit}</div>
      </div>
      <div class="detail-card">
        <i class="fas fa-compress-alt"></i>
        <div class="detail-label">Pressure</div>
        <div class="detail-value">${data.main.pressure} hPa</div>
      </div>
      <div class="detail-card">
        <i class="fas fa-eye"></i>
        <div class="detail-label">Visibility</div>
        <div class="detail-value">${(data.visibility / 1000).toFixed(1)} km</div>
      </div>
      <div class="detail-card">
        <i class="fas fa-sun"></i>
        <div class="detail-label">Sunrise/Sunset</div>
        <div class="detail-value">${new Date(data.sys.sunrise * 1000).toLocaleTimeString()} / ${new Date(data.sys.sunset * 1000).toLocaleTimeString()}</div>
      </div>
    </div>
  `;
  
  document.getElementById("currentWeather").innerHTML = html;
}

function displayForecast(forecastData) {
  const dailyForecasts = {};
  
  forecastData.list.forEach(item => {
    const date = new Date(item.dt * 1000);
    const dateKey = date.toLocaleDateString();
    
    if (!dailyForecasts[dateKey]) {
      dailyForecasts[dateKey] = {
        temps: [],
        weather: item.weather[0],
        date: date
      };
    }
    dailyForecasts[dateKey].temps.push(item.main.temp);
  });
  
  const unitSymbol = currentUnit === "metric" ? "C" : "F";
  const forecastHTML = Object.values(dailyForecasts).slice(0, 5).map(day => {
    const avgTemp = Math.round(day.temps.reduce((a, b) => a + b, 0) / day.temps.length);
    const icon = getWeatherIcon(day.weather.main);
    const dayName = day.date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
    
    return `
      <div class="forecast-item">
        <div class="forecast-date">${dayName}</div>
        <div class="forecast-icon">${icon}</div>
        <div class="forecast-temp">${avgTemp}°${unitSymbol}</div>
        <div class="forecast-desc">${day.weather.description}</div>
      </div>
    `;
  }).join("");
  
  document.getElementById("forecastContainer").innerHTML = forecastHTML;
}

function calculateStatistics(forecastData) {
  const temps = forecastData.list.map(item => item.main.temp);
  const humidities = forecastData.list.map(item => item.main.humidity);
  
  const avgTemp = (temps.reduce((a, b) => a + b, 0) / temps.length).toFixed(1);
  const maxTemp = Math.max(...temps);
  const minTemp = Math.min(...temps);
  const avgHumidity = Math.round(humidities.reduce((a, b) => a + b, 0) / humidities.length);
  const unitSymbol = currentUnit === "metric" ? "C" : "F";
  
  const statsHTML = `
    <div class="stat-item">
      <div class="stat-value">${avgTemp}°${unitSymbol}</div>
      <div class="stat-label">Average Temperature</div>
    </div>
    <div class="stat-item">
      <div class="stat-value">${maxTemp}°${unitSymbol}</div>
      <div class="stat-label">Maximum Temperature</div>
    </div>
    <div class="stat-item">
      <div class="stat-value">${minTemp}°${unitSymbol}</div>
      <div class="stat-label">Minimum Temperature</div>
    </div>
    <div class="stat-item">
      <div class="stat-value">${avgHumidity}%</div>
      <div class="stat-label">Average Humidity</div>
    </div>
  `;
  
  document.getElementById("statsContainer").innerHTML = statsHTML;
}

async function updateMap(city) {
  try {
    const response = await fetch(`https://api.openweathermap.org/data/2.5/weather?q=${city}&appid=${apiKey}`);
    const data = await response.json();
    
    if (currentMap) {
      currentMap.remove();
    }
    
    currentMap = L.map('map').setView([data.coord.lat, data.coord.lon], 10);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap contributors'
    }).addTo(currentMap);
    
    const temp = Math.round(data.main.temp);
    L.marker([data.coord.lat, data.coord.lon])
      .addTo(currentMap)
      .bindPopup(`
        <b>${data.name}</b><br>
        ${data.weather[0].description}<br>
        ${temp}°C
      `)
      .openPopup();
  } catch (error) {
    console.error("Map error:", error);
  }
}

function getCurrentLocation() {
  if (navigator.geolocation) {
    navigator.geolocation.getCurrentPosition(async (position) => {
      const { latitude, longitude } = position.coords;
      try {
        const response = await fetch(`https://api.openweathermap.org/data/2.5/weather?lat=${latitude}&lon=${longitude}&appid=${apiKey}&units=${currentUnit}`);
        const data = await response.json();
        currentCity = data.name;
        getWeatherData(data.name);
        updateMap(data.name);
        showMessage(`📍 Your location: ${data.name}`, "success");
      } catch (error) {
        showMessage("⚠️ Failed to get your location", "error");
      }
    });
  } else {
    showMessage("⚠️ Geolocation not supported", "error");
  }
}

function addCurrentCityToFavorites() {
  if (!favoriteCities.includes(currentCity)) {
    favoriteCities.push(currentCity);
    localStorage.setItem("favoriteCities", JSON.stringify(favoriteCities));
    loadFavorites();
    showMessage(`⭐ ${currentCity} added to favorites`, "success");
  } else {
    showMessage(`⚠️ ${currentCity} already in favorites`, "warning");
  }
}

function loadFavorites() {
  const favoritesList = document.getElementById("favoritesList");
  favoritesList.innerHTML = favoriteCities.map(city => `
    <div class="fav-city">
      <span onclick="selectFavoriteCity('${city}')">${city}</span>
      <button class="remove-fav" onclick="removeFavoriteCity('${city}')">×</button>
    </div>
  `).join("");
}

function selectFavoriteCity(city) {
  currentCity = city;
  getWeatherData(city);
  updateMap(city);
  document.getElementById("cityInput").value = city;
}

function removeFavoriteCity(city) {
  favoriteCities = favoriteCities.filter(c => c !== city);
  localStorage.setItem("favoriteCities", JSON.stringify(favoriteCities));
  loadFavorites();
  showMessage(`🗑️ ${city} removed from favorites`, "info");
}

async function updateWeatherForFavorites() {
  for (const city of favoriteCities) {
    await getWeatherData(city, false);
  }
}

async function refreshAll() {
  showMessage("🔄 Updating all weather data...", "info");
  await getWeatherData(currentCity);
  await updateWeatherForFavorites();
  showMessage("✅ All data updated successfully", "success");
}

function changeUnit(unit) {
  currentUnit = unit;
  getWeatherData(currentCity);
  updateWeatherForFavorites();
  
  document.getElementById("celsiusBtn").classList.toggle("active", unit === "metric");
  document.getElementById("fahrenheitBtn").classList.toggle("active", unit === "imperial");
}

function toggleTheme() {
  document.body.classList.toggle("light-mode");
  const isLight = document.body.classList.contains("light-mode");
  const themeBtn = document.getElementById("themeToggle");
  
  if (isLight) {
    themeBtn.innerHTML = '<i class="fas fa-sun"></i>';
    localStorage.setItem("darkMode", "light");
  } else {
    themeBtn.innerHTML = '<i class="fas fa-moon"></i>';
    localStorage.setItem("darkMode", "dark");
  }
}

function toggleAutoRefresh(e) {
  if (e.target.checked) {
    startAutoRefresh();
    localStorage.setItem("autoRefresh", "true");
  } else {
    if (autoRefreshInterval) {
      clearInterval(autoRefreshInterval);
      autoRefreshInterval = null;
    }
    localStorage.setItem("autoRefresh", "false");
  }
}

function startAutoRefresh() {
  if (autoRefreshInterval) clearInterval(autoRefreshInterval);
  autoRefreshInterval = setInterval(() => {
    refreshAll();
  }, 300000);
}

function getWeatherIcon(weatherMain) {
  const icons = {
    "Clear": "☀️",
    "Clouds": "☁️",
    "Rain": "🌧️",
    "Drizzle": "🌦️",
    "Thunderstorm": "⛈️",
    "Snow": "❄️",
    "Mist": "🌫️",
    "Fog": "🌫️",
    "Haze": "😶‍🌫️"
  };
  return icons[weatherMain] || "🌡️";
}

function showMessage(message, type) {
  const notification = document.getElementById("notification");
  notification.textContent = message;
  notification.classList.add("show");
  
  const colors = {
    success: "#10b981",
    error: "#ef4444",
    warning: "#f59e0b",
    info: "#3b82f6"
  };
  
  notification.style.background = `linear-gradient(135deg, ${colors[type] || "#60a5fa"}, ${colors[type] || "#a78bfa"})`;
  
  setTimeout(() => {
    notification.classList.remove("show");
  }, 3000);
}