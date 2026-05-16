import { useState, useEffect } from 'react';

export default function WeatherWidget({ variant = 'default' }) {
  const [weather, setWeather] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Location: 123 Đường Nguyễn Huệ, Quận 1, TP.HCM
    const lat = 10.7769;
    const lon = 106.7009;
    
    // Using Open-Meteo as it's free and requires no API key
    fetch(`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current_weather=true`)
      .then(res => res.json())
      .then(data => {
        setWeather(data.current_weather);
        setLoading(false);
      })
      .catch(err => {
        console.error("Failed to fetch weather", err);
        setLoading(false);
      });
  }, []);

  if (loading || !weather) return null;

  const getWeatherDetails = (code) => {
    // WMO Weather interpretation codes (https://open-meteo.com/en/docs)
    if (code === 0) return { icon: 'light_mode', desc: 'Trời quang' };
    if (code === 1 || code === 2) return { icon: 'partly_cloudy_day', desc: 'Ít mây' };
    if (code === 3) return { icon: 'cloud', desc: 'Nhiều mây' };
    if (code >= 45 && code <= 48) return { icon: 'foggy', desc: 'Có sương mù' };
    if (code >= 51 && code <= 67) return { icon: 'rainy', desc: 'Có mưa' };
    if (code >= 71 && code <= 77) return { icon: 'ac_unit', desc: 'Có tuyết' };
    if (code >= 80 && code <= 82) return { icon: 'rainy', desc: 'Mưa rào' };
    if (code >= 95) return { icon: 'thunderstorm', desc: 'Giông bão' };
    return { icon: 'cloud', desc: 'Nhiều mây' };
  };

  const { icon, desc } = getWeatherDetails(weather.weathercode);
  const temp = Math.round(weather.temperature);

  if (variant === 'card') {
    return (
      <div style={{
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center', 
        gap: '16px',
        padding: '16px 24px', 
        background: 'rgba(255, 255, 255, 0.12)',
        borderRadius: 'var(--g-radius-full, 100px)', 
        backdropFilter: 'blur(12px)', 
        border: '1px solid rgba(255, 255, 255, 0.25)',
        color: '#ffffff',
        boxShadow: '0 8px 32px rgba(0, 0, 0, 0.15)',
        transition: 'transform 0.3s ease, background 0.3s ease',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = 'translateY(-2px)';
        e.currentTarget.style.background = 'rgba(255, 255, 255, 0.18)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = '';
        e.currentTarget.style.background = 'rgba(255, 255, 255, 0.12)';
      }}
      >
        <span className="material-symbols-outlined" style={{ fontSize: '38px', color: '#ffcc00' }}>
          {icon}
        </span>
        <div style={{ textAlign: 'left' }}>
          <div style={{ fontSize: '1.6rem', fontWeight: '800', lineHeight: '1.1' }}>
            {temp}°C
          </div>
          <div style={{ fontSize: '0.85rem', opacity: 0.9, letterSpacing: '0.5px' }}>
            123 Nguyễn Huệ • {desc}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div 
      title={`Thời tiết 123 Nguyễn Huệ, Quận 1, TP.HCM: ${desc}`}
      style={{
        display: 'flex', 
        alignItems: 'center', 
        gap: '8px',
        color: 'var(--a-text)', 
        fontSize: '0.9rem',
        padding: '6px 14px', 
        borderRadius: '100px',
        background: 'var(--a-surface)', 
        border: '1px solid var(--a-border)',
        boxShadow: '0 2px 8px rgba(0,0,0,0.05)',
        cursor: 'default'
      }}
    >
      <span className="material-symbols-outlined" style={{ fontSize: '20px', color: 'var(--a-primary)' }}>
        {icon}
      </span>
      <span style={{ fontWeight: 700 }}>{temp}°C</span>
      <span style={{ fontSize: '0.8rem', color: 'var(--a-text-muted)' }}>123 Nguyễn Huệ, Q.1</span>
    </div>
  );
}
