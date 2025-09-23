import React, { useEffect, useMemo, useState } from 'react'
import './App.css'

const DAY_MS = 24 * 60 * 60 * 1000
const HOUR_MS = 60 * 60 * 1000
const MINUTE_MS = 60 * 1000

const integerFormatter = new Intl.NumberFormat(undefined, { maximumFractionDigits: 0 })
const compactFormatter = new Intl.NumberFormat(undefined, { notation: 'compact', maximumFractionDigits: 1 })

function getNextTargetDate(reference = new Date()) {
  const year = reference.getFullYear()
  const target = new Date(year, 11, 19, 0, 0, 0, 0)
  const eventEnd = new Date(target)
  eventEnd.setDate(eventEnd.getDate() + 1)
  if (reference >= eventEnd) {
    return new Date(year + 1, 11, 19, 0, 0, 0, 0)
  }
  return target
}

function computeTimeLeft(targetDate, now = new Date()) {
  const diff = targetDate.getTime() - now.getTime()
  const clamped = Math.max(diff, 0)
  const eventEnd = new Date(targetDate)
  eventEnd.setDate(eventEnd.getDate() + 1)
  const isEventWindow = now >= targetDate && now < eventEnd
  const days = Math.floor(clamped / DAY_MS)
  const hours = Math.floor((clamped % DAY_MS) / HOUR_MS)
  const minutes = Math.floor((clamped % HOUR_MS) / MINUTE_MS)
  const seconds = Math.floor((clamped % MINUTE_MS) / 1000)
  return { diff, clamped, days, hours, minutes, seconds, isEventWindow }
}

function pad(value) {
  return String(Math.max(0, value)).padStart(2, '0')
}

function formatDuration(ms) {
  if (typeof ms !== 'number' || Number.isNaN(ms) || ms < 0) return ''
  const totalSeconds = Math.floor(ms / 1000)
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60
  return `${minutes}:${String(seconds).padStart(2, '0')}`
}

function formatStat(value) {
  if (value === undefined || value === null) return null
  const number = Number(value)
  if (!Number.isFinite(number)) return null
  return {
    compact: compactFormatter.format(number),
    full: integerFormatter.format(number),
  }
}

export default function App() {
  const [targetDate, setTargetDate] = useState(() => getNextTargetDate(new Date()))
  const [timeLeft, setTimeLeft] = useState(() => computeTimeLeft(targetDate))

  const [spotifyToken, setSpotifyToken] = useState('')
  const [spotifyResult, setSpotifyResult] = useState({ status: 'idle' })

  const [youtubeApiKey, setYoutubeApiKey] = useState('')
  const [youtubeChannelId, setYoutubeChannelId] = useState('')
  const [youtubeResult, setYoutubeResult] = useState({ status: 'idle' })

  useEffect(() => {
    document.title = 'Days until I see Nelusik'
  }, [])

  useEffect(() => {
    const update = () => {
      const now = new Date()
      const eventEnd = new Date(targetDate)
      eventEnd.setDate(eventEnd.getDate() + 1)

      if (now >= eventEnd) {
        const nextTarget = getNextTargetDate(now)
        setTargetDate(nextTarget)
        setTimeLeft(computeTimeLeft(nextTarget, now))
        return
      }

      setTimeLeft(computeTimeLeft(targetDate, now))
    }

    update()
    const id = setInterval(update, 1000)
    return () => clearInterval(id)
  }, [targetDate])

  const eventDateLabel = useMemo(
    () =>
      targetDate.toLocaleDateString(undefined, {
        month: 'long',
        day: 'numeric',
        year: 'numeric',
      }),
    [targetDate],
  )

  const timezoneLabel = useMemo(() => {
    try {
      return Intl.DateTimeFormat().resolvedOptions().timeZone
    } catch (error) {
      console.warn('Unable to resolve timezone', error)
      return 'your local time zone'
    }
  }, [])

  const handleSpotifyFetch = async () => {
    if (!spotifyToken.trim()) {
      setSpotifyResult({ status: 'error', message: 'Please paste a valid Spotify access token.' })
      return
    }

    setSpotifyResult({ status: 'loading' })

    try {
      const response = await fetch('https://api.spotify.com/v1/me/player/currently-playing', {
        headers: { Authorization: `Bearer ${spotifyToken.trim()}` },
      })

      if (response.status === 204) {
        setSpotifyResult({
          status: 'success',
          message: 'Spotify is quiet right now. Start playback to see track details.',
          isPlaying: false,
        })
        return
      }

      let payload = null
      try {
        payload = await response.json()
      } catch (parseError) {
        payload = null
      }

      if (!response.ok) {
        const message = payload?.error?.message || `Spotify request failed (${response.status})`
        throw new Error(message)
      }

      if (!payload || !payload.item) {
        setSpotifyResult({
          status: 'success',
          message: 'No track is playing right now. Start playback to see details.',
          isPlaying: false,
        })
        return
      }

      const track = {
        name: payload.item.name,
        artists: (payload.item.artists || []).map(artist => artist?.name).filter(Boolean).join(', '),
        album: payload.item.album?.name,
        image: payload.item.album?.images?.[0]?.url,
        url: payload.item.external_urls?.spotify,
      }

      const progressMs = typeof payload.progress_ms === 'number' ? payload.progress_ms : null
      const durationMs = typeof payload.item.duration_ms === 'number' ? payload.item.duration_ms : null

      setSpotifyResult({
        status: 'success',
        data: track,
        isPlaying: Boolean(payload.is_playing),
        progressMs,
        durationMs,
        message: payload.is_playing ? 'Spotify is playing right now.' : 'Playback is currently paused.',
      })
    } catch (error) {
      setSpotifyResult({
        status: 'error',
        message: error?.message || 'Unexpected error contacting Spotify.',
      })
    }
  }

  const handleYouTubeFetch = async () => {
    if (!youtubeApiKey.trim() || !youtubeChannelId.trim()) {
      setYoutubeResult({ status: 'error', message: 'Please enter both a channel ID and a YouTube API key.' })
      return
    }

    setYoutubeResult({ status: 'loading' })

    try {
      const trimmedKey = youtubeApiKey.trim()
      const trimmedChannel = youtubeChannelId.trim()

      const channelParams = new URLSearchParams({
        part: 'snippet,statistics,contentDetails',
        id: trimmedChannel,
        key: trimmedKey,
      })
      const channelResponse = await fetch(`https://www.googleapis.com/youtube/v3/channels?${channelParams.toString()}`)
      const channelData = await channelResponse.json()

      if (!channelResponse.ok) {
        const message = channelData?.error?.message || `YouTube request failed (${channelResponse.status})`
        throw new Error(message)
      }

      const channel = Array.isArray(channelData?.items) ? channelData.items[0] : null
      if (!channel) {
        setYoutubeResult({ status: 'error', message: 'No channel data found. Double-check the channel ID.' })
        return
      }

      const uploadsPlaylistId = channel.contentDetails?.relatedPlaylists?.uploads
      let latestVideo = null
      let latestVideoError = null

      if (uploadsPlaylistId) {
        const playlistParams = new URLSearchParams({
          part: 'snippet',
          playlistId: uploadsPlaylistId,
          maxResults: '1',
          key: trimmedKey,
        })

        try {
          const playlistResponse = await fetch(
            `https://www.googleapis.com/youtube/v3/playlistItems?${playlistParams.toString()}`,
          )
          const playlistData = await playlistResponse.json()

          if (!playlistResponse.ok) {
            latestVideoError =
              playlistData?.error?.message || `Unable to fetch the latest upload (${playlistResponse.status})`
          } else if (Array.isArray(playlistData.items) && playlistData.items.length > 0) {
            const snippet = playlistData.items[0].snippet
            latestVideo = {
              title: snippet?.title,
              publishedAt: snippet?.publishedAt,
              videoId: snippet?.resourceId?.videoId,
              url: snippet?.resourceId?.videoId
                ? `https://www.youtube.com/watch?v=${snippet.resourceId.videoId}`
                : undefined,
              thumbnail:
                snippet?.thumbnails?.medium?.url || snippet?.thumbnails?.high?.url || snippet?.thumbnails?.default?.url,
            }
          }
        } catch (playlistError) {
          latestVideoError = playlistError?.message || 'Unable to fetch the latest upload.'
        }
      }

      setYoutubeResult({
        status: 'success',
        channel: {
          title: channel.snippet?.title,
          description: channel.snippet?.description,
          thumbnail: channel.snippet?.thumbnails?.high?.url || channel.snippet?.thumbnails?.default?.url,
          subscriberCount: channel.statistics?.subscriberCount,
          viewCount: channel.statistics?.viewCount,
          videoCount: channel.statistics?.videoCount,
          url: channel.customUrl
            ? `https://www.youtube.com/${channel.customUrl}`
            : channel.id
            ? `https://www.youtube.com/channel/${channel.id}`
            : undefined,
        },
        latestVideo,
        latestVideoError,
      })
    } catch (error) {
      setYoutubeResult({
        status: 'error',
        message: error?.message || 'Unexpected error contacting YouTube.',
      })
    }
  }

  const spotifyProgressPercent =
    spotifyResult &&
    typeof spotifyResult.progressMs === 'number' &&
    typeof spotifyResult.durationMs === 'number' &&
    spotifyResult.durationMs > 0
      ? Math.min(100, Math.round((spotifyResult.progressMs / spotifyResult.durationMs) * 100))
      : null

  const latestVideoPublished = useMemo(() => {
    if (!youtubeResult.latestVideo?.publishedAt) return null
    try {
      return new Date(youtubeResult.latestVideo.publishedAt).toLocaleDateString(undefined, {
        month: 'long',
        day: 'numeric',
        year: 'numeric',
      })
    } catch (error) {
      console.warn('Unable to parse YouTube publish date', error)
      return null
    }
  }, [youtubeResult.latestVideo?.publishedAt])

  const countdownClasses = ['countdown']
  if (timeLeft.isEventWindow) countdownClasses.push('countdown--today')

  return (
    <div className="app">
      <div className="main-card">
        <header className="header">
          <span className="eyebrow">Holiday countdown overlay</span>
          <h1>Days until I see Nelusik</h1>
          <p>
            {timeLeft.isEventWindow
              ? 'December 19 is finally here — enjoy every moment together!'
              : `Counting down to December 19, ${targetDate.getFullYear()} right on your clock.`}
          </p>
        </header>

        <section className={countdownClasses.join(' ')} aria-live="polite">
          <div className="countdown-days">
            <span className="countdown-number">{integerFormatter.format(Math.max(timeLeft.days, 0))}</span>
            <span className="countdown-label">days</span>
          </div>
          <div className="countdown-clock" role="presentation">
            <div className="countdown-pill">
              <span className="countdown-pill__number">{pad(timeLeft.hours)}</span>
              <span className="countdown-pill__label">hours</span>
            </div>
            <div className="countdown-pill">
              <span className="countdown-pill__number">{pad(timeLeft.minutes)}</span>
              <span className="countdown-pill__label">minutes</span>
            </div>
            <div className="countdown-pill">
              <span className="countdown-pill__number">{pad(timeLeft.seconds)}</span>
              <span className="countdown-pill__label">seconds</span>
            </div>
          </div>
          <p className="countdown-note">
            {timeLeft.isEventWindow
              ? 'The counter holds at zero for the full day and will reset for next year once December 19 ends.'
              : `Target date: ${eventDateLabel}. Updates every second in your ${timezoneLabel || 'local time zone'}.`}
          </p>
        </section>

        <section className="api-grid">
          <article className="api-card api-card--spotify">
            <div className="api-card__header">
              <h2 className="api-card__title">Spotify now playing</h2>
              <span className="api-card__badge">Web API</span>
            </div>
            <p>
              Paste a short-lived OAuth token to surface your currently playing track right above the countdown. Perfect for OBS
              or stream overlays.
            </p>
            <p className="api-card__help">
              Generate a token from{' '}
              <a
                href="https://developer.spotify.com/console/get-user-currently-playing/"
                target="_blank"
                rel="noreferrer"
              >
                Spotify&apos;s API console
              </a>{' '}
              with the <code>user-read-currently-playing</code> scope enabled.
            </p>
            <label htmlFor="spotify-token">Spotify access token</label>
            <textarea
              id="spotify-token"
              placeholder="BQD..."
              value={spotifyToken}
              onChange={event => setSpotifyToken(event.target.value)}
              spellCheck={false}
              autoComplete="off"
            />
            <div className="api-card__actions">
              <button
                type="button"
                onClick={handleSpotifyFetch}
                disabled={!spotifyToken.trim() || spotifyResult.status === 'loading'}
              >
                {spotifyResult.status === 'loading' ? 'Contacting Spotify…' : 'Check playback'}
              </button>
              <small className="api-card__help">Tokens stay in this browser only and clear when you refresh.</small>
            </div>

            {spotifyResult.status === 'idle' && (
              <p className="api-card__status">
                Paste your token and press the button to show the track you&apos;re listening to alongside the countdown.
              </p>
            )}

            {spotifyResult.status === 'error' && (
              <p className="api-card__status api-card__status--error" role="alert">
                {spotifyResult.message || 'Unable to contact Spotify right now.'}
              </p>
            )}

            {spotifyResult.status === 'success' && (
              <>
                {spotifyResult.data && (
                  <div className="spotify-track">
                    {spotifyResult.data.image && (
                      <img
                        className="spotify-track__artwork"
                        src={spotifyResult.data.image}
                        alt={
                          spotifyResult.data.album
                            ? `Album art for ${spotifyResult.data.album}`
                            : `Cover art for ${spotifyResult.data.name}`
                        }
                      />
                    )}
                    <div className="spotify-track__meta">
                      {spotifyResult.data.name && <p className="spotify-track__title">{spotifyResult.data.name}</p>}
                      {spotifyResult.data.artists && (
                        <p className="spotify-track__artists">{spotifyResult.data.artists}</p>
                      )}
                      {spotifyResult.data.album && <p className="spotify-track__album">{spotifyResult.data.album}</p>}
                      {spotifyResult.data.url && (
                        <a className="spotify-track__link" href={spotifyResult.data.url} target="_blank" rel="noreferrer">
                          Open in Spotify
                        </a>
                      )}
                    </div>
                  </div>
                )}

                {spotifyProgressPercent !== null && spotifyResult.data && (
                  <div>
                    <div className="spotify-progress" role="presentation">
                      <div className="spotify-progress__bar" style={{ width: `${spotifyProgressPercent}%` }} />
                    </div>
                    <div className="spotify-progress__labels">
                      <span>{formatDuration(spotifyResult.progressMs)}</span>
                      <span>{formatDuration(spotifyResult.durationMs)}</span>
                    </div>
                  </div>
                )}

                {spotifyResult.message && (
                  <p className="api-card__status api-card__status--success" role="status">
                    {spotifyResult.message}
                  </p>
                )}

                {!spotifyResult.data && !spotifyResult.message && (
                  <p className="api-card__status api-card__status--success" role="status">
                    Spotify responded successfully.
                  </p>
                )}
              </>
            )}
          </article>

          <article className="api-card api-card--youtube">
            <div className="api-card__header">
              <h2 className="api-card__title">YouTube channel snapshot</h2>
              <span className="api-card__badge">Data API v3</span>
            </div>
            <p>Load live channel stats and the latest upload to match your countdown overlay.</p>
            <p className="api-card__help">
              Create an API key in{' '}
              <a
                href="https://console.cloud.google.com/apis/library/youtube.googleapis.com"
                target="_blank"
                rel="noreferrer"
              >
                Google Cloud Console
              </a>{' '}
              and copy your channel ID from YouTube Studio (&ldquo;Advanced settings&rdquo;).
            </p>
            <label htmlFor="youtube-channel">Channel ID</label>
            <input
              id="youtube-channel"
              placeholder="UC..."
              value={youtubeChannelId}
              onChange={event => setYoutubeChannelId(event.target.value)}
              autoComplete="off"
            />
            <label htmlFor="youtube-key">YouTube API key</label>
            <input
              id="youtube-key"
              placeholder="AIza..."
              value={youtubeApiKey}
              onChange={event => setYoutubeApiKey(event.target.value)}
              autoComplete="off"
            />
            <div className="api-card__actions">
              <button
                type="button"
                onClick={handleYouTubeFetch}
                disabled={!youtubeApiKey.trim() || !youtubeChannelId.trim() || youtubeResult.status === 'loading'}
              >
                {youtubeResult.status === 'loading' ? 'Contacting YouTube…' : 'Load channel'}
              </button>
            </div>

            {youtubeResult.status === 'idle' && (
              <p className="api-card__status">
                Provide a channel ID and API key to pull live metrics next to your countdown.
              </p>
            )}

            {youtubeResult.status === 'error' && (
              <p className="api-card__status api-card__status--error" role="alert">
                {youtubeResult.message || 'Unable to contact YouTube right now.'}
              </p>
            )}

            {youtubeResult.status === 'success' && (
              <>
                {youtubeResult.channel && (
                  <>
                    <div className="youtube-channel">
                      {youtubeResult.channel.thumbnail && (
                        <img
                          className="youtube-channel__thumb"
                          src={youtubeResult.channel.thumbnail}
                          alt={`${youtubeResult.channel.title || 'Channel'} avatar`}
                        />
                      )}
                      <div className="youtube-channel__meta">
                        {youtubeResult.channel.title && (
                          <p className="youtube-channel__title">{youtubeResult.channel.title}</p>
                        )}
                        <div className="youtube-channel__stats">
                          {(() => {
                            const stat = formatStat(youtubeResult.channel.subscriberCount)
                            return stat ? (
                              <span className="youtube-channel__stat" title={`${stat.full} subscribers`}>
                                {stat.compact} subs
                              </span>
                            ) : null
                          })()}
                          {(() => {
                            const stat = formatStat(youtubeResult.channel.viewCount)
                            return stat ? (
                              <span className="youtube-channel__stat" title={`${stat.full} total views`}>
                                {stat.compact} views
                              </span>
                            ) : null
                          })()}
                          {(() => {
                            const stat = formatStat(youtubeResult.channel.videoCount)
                            return stat ? (
                              <span className="youtube-channel__stat" title={`${stat.full} uploaded videos`}>
                                {stat.compact} videos
                              </span>
                            ) : null
                          })()}
                        </div>
                        {youtubeResult.channel.url && (
                          <a
                            className="youtube-channel__link"
                            href={youtubeResult.channel.url}
                            target="_blank"
                            rel="noreferrer"
                          >
                            Open channel
                          </a>
                        )}
                      </div>
                    </div>
                    {youtubeResult.channel.description && (
                      <p className="youtube-channel__description">{youtubeResult.channel.description}</p>
                    )}
                  </>
                )}

                {youtubeResult.latestVideo && (
                  <div className="youtube-latest">
                    {youtubeResult.latestVideo.thumbnail && (
                      <img
                        className="youtube-latest__thumb"
                        src={youtubeResult.latestVideo.thumbnail}
                        alt={youtubeResult.latestVideo.title || 'Latest YouTube upload thumbnail'}
                      />
                    )}
                    <div className="youtube-latest__meta">
                      {youtubeResult.latestVideo.title && (
                        <p className="youtube-latest__title">{youtubeResult.latestVideo.title}</p>
                      )}
                      {latestVideoPublished && (
                        <p className="youtube-latest__date">Published {latestVideoPublished}</p>
                      )}
                      {youtubeResult.latestVideo.url && (
                        <a
                          className="youtube-channel__link"
                          href={youtubeResult.latestVideo.url}
                          target="_blank"
                          rel="noreferrer"
                        >
                          Watch latest video
                        </a>
                      )}
                    </div>
                  </div>
                )}

                {youtubeResult.latestVideoError && (
                  <p className="api-card__status" role="status">
                    {youtubeResult.latestVideoError}
                  </p>
                )}
              </>
            )}
          </article>
        </section>

        <p className="disclaimer">
          <strong>Privacy note:</strong> OAuth tokens and API keys never leave this page—they stay in memory inside your browser
          session. Refresh the app to clear them once you are done.
        </p>
      </div>
    </div>
  )
}
