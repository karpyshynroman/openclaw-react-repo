import React, { useEffect, useMemo, useState } from 'react'
import { weatherCodeText } from './weatherCodes.js'

function fmtNum(n, digits = 2) {
  if (typeof n !== 'number' || Number.isNaN(n)) return '—'
  return n.toFixed(digits)
}

export default function App() {
  const [coords, setCoords] = useState(null) // {lat, lon, accuracy}
  const [geoStatus, setGeoStatus] = useState('idle') // idle|requesting|granted|denied|error|unsupported
  const [weather, setWeather] = useState(null)
  const [weatherStatus, setWeatherStatus] = useState('idle') // idle|loading|ok|error
  const [error, setError] = useState(null)

  const tz = useMemo(() => {
    try {
      return Intl.DateTimeFormat().resolvedOptions().timeZone || '—'
    } catch {
      return '—'
    }
  }, [])

  const locale = useMemo(() => navigator.language || '—', [])

  const requestLocation = () => {
    setError(null)

    if (!('geolocation' in navigator)) {
      setGeoStatus('unsupported')
      return
    }

    setGeoStatus('requesting')

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setGeoStatus('granted')
        setCoords({
          lat: pos.coords.latitude,
          lon: pos.coords.longitude,
          accuracy: pos.coords.accuracy,
        })
      },
      (err) => {
        if (err.code === err.PERMISSION_DENIED) {
          setGeoStatus('denied')
          setError('Location permission denied. Enable it to show weather for your current region.')
        } else {
          setGeoStatus('error')
          setError(err.message || 'Failed to get location')
        }
      },
      { enableHighAccuracy: false, timeout: 12000, maximumAge: 5 * 60 * 1000 }
    )
  }

  useEffect(() => {
    // Auto-request on first load
    requestLocation()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    const run = async () => {
      if (!coords) return

      setWeatherStatus('loading')
      setError(null)

      const url = new URL('https://api.open-meteo.com/v1/forecast')
      url.searchParams.set('latitude', String(coords.lat))
      url.searchParams.set('longitude', String(coords.lon))
      url.searchParams.set('current', 'temperature_2m,weather_code,wind_speed_10m')
      url.searchParams.set('timezone', 'auto')

      try {
        const res = await fetch(url)
        if (!res.ok) throw new Error(`Weather API error: ${res.status}`)
        const data = await res.json()
        setWeather(data)
        setWeatherStatus('ok')
      } catch (e) {
        setWeatherStatus('error')
        setError(e?.message || 'Failed to load weather')
      }
    }

    run()
  }, [coords])

  const current = weather?.current
  const code = current?.weather_code

  return (
    <div className="wrap">
      <div className="card">
        <div className="badge">OpenClaw · React · Weather</div>
        <h1>Your region weather</h1>
        <p className="sub">
          Uses <b>browser settings</b> (locale/timezone) + <b>Geolocation API</b> (with your permission)
          to fetch current weather from Open‑Meteo.
        </p>

        <div className="grid">
          <div className="row">
            <div className="k">Locale</div>
            <div className="v">{locale}</div>
          </div>
          <div className="row">
            <div className="k">Time zone</div>
            <div className="v">{tz}</div>
          </div>
          <div className="row">
            <div className="k">Geolocation</div>
            <div className="v">
              {geoStatus === 'requesting' && 'Requesting…'}
              {geoStatus === 'granted' && 'Granted'}
              {geoStatus === 'denied' && 'Denied'}
              {geoStatus === 'unsupported' && 'Unsupported'}
              {geoStatus === 'error' && 'Error'}
              {geoStatus === 'idle' && 'Idle'}
            </div>
          </div>

          <div className="row">
            <div className="k">Latitude</div>
            <div className="v">{coords ? fmtNum(coords.lat, 4) : '—'}</div>
          </div>
          <div className="row">
            <div className="k">Longitude</div>
            <div className="v">{coords ? fmtNum(coords.lon, 4) : '—'}</div>
          </div>
          <div className="row">
            <div className="k">Accuracy</div>
            <div className="v">{coords ? `${Math.round(coords.accuracy)} m` : '—'}</div>
          </div>

          <div className="row">
            <div className="k">Weather</div>
            <div className="v">
              {weatherStatus === 'idle' && '—'}
              {weatherStatus === 'loading' && 'Loading…'}
              {weatherStatus === 'error' && 'Error'}
              {weatherStatus === 'ok' && (
                <span>
                  {weatherCodeText[code] || `Code ${code}`}
                </span>
              )}
            </div>
          </div>

          <div className="row">
            <div className="k">Temperature</div>
            <div className="v">{current?.temperature_2m != null ? `${current.temperature_2m}°C` : '—'}</div>
          </div>
          <div className="row">
            <div className="k">Wind</div>
            <div className="v">{current?.wind_speed_10m != null ? `${current.wind_speed_10m} km/h` : '—'}</div>
          </div>
        </div>

        {error && <div className="error">{error}</div>}

        <div className="actions">
          <button onClick={requestLocation}>Re-detect location</button>
          {coords && (
            <a
              className="link"
              href={`https://www.open-meteo.com/en/docs#latitude=${coords.lat}&longitude=${coords.lon}`}
              target="_blank"
              rel="noreferrer"
            >
              Open‑Meteo docs
            </a>
          )}
        </div>

        <div className="footer">
          Tip: if the page doesn’t update on GitHub Pages, do a hard refresh (Ctrl+F5 / Cmd+Shift+R).
        </div>
      </div>
    </div>
  )
}
