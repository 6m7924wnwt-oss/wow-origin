/**
 * @name Wow 音源（Telegram：@isJielin）
 * @description 聚合自公开接口 wow.xdo.cc
 * @version v1.0
 * @author Compile by @isJielin
 */

const WOW_CONFIG = {"serverURL":"https://wow.xdo.cc","apiKey":"a1e4ce83b693dcc9d9b92c7a58fe53ca","sources":["tx","wy"]}

const REQUEST_TIMEOUT_MS = 17000
const MAX_AUDIO_URL_LENGTH = 2048

const { EVENT_NAMES, request, on, send } = globalThis.lx

const SOURCE_PREFIX = {
  tx: 'qq',
  wy: 'wy',
}

const SOURCE_NAME = 'Wow 音源'

const QUALITY_MAP = {
  '128k': 'standard',
  '320k': 'exhigh',
  flac: 'lossless',
  flac24bit: 'lossless',
}

const serverURL = String(WOW_CONFIG.serverURL || '').trim().replace(/\/+$/, '')
const apiKey = String(WOW_CONFIG.apiKey || '').trim()
const enabledSources = (WOW_CONFIG.sources || []).filter(
  (source) => SOURCE_PREFIX[source],
)

if (!/^https?:\/\/[^/]+/i.test(serverURL)) {
  throw new Error('Wow 音源配置的服务器地址无效')
}
if (!apiKey) {
  throw new Error('Wow 音源配置缺少访问令牌')
}

const requestJSON = (url, options) => new Promise((resolve, reject) => {
  request(url, options, (err, resp, body) => {
    if (err) return reject(err instanceof Error ? err : new Error(String(err)))

    let payload = body
    if (typeof payload === 'string') {
      try {
        payload = JSON.parse(payload)
      } catch {}
    }

    const status = resp && typeof resp.statusCode === 'number' ? resp.statusCode : 0
    if (status < 200 || status >= 300) {
      const message = payload && typeof payload.message === 'string'
        ? payload.message
        : `wow-server 返回 HTTP ${status || 'unknown'}`
      return reject(new Error(message))
    }

    if (!payload || payload.code !== 200) {
      const message = payload && typeof payload.message === 'string'
        ? payload.message
        : 'wow-server 返回了非 200 信封'
      return reject(new Error(message))
    }

    resolve(payload.data)
  })
})

const getMusicUrl = async({ source, info }) => {
  const prefix = SOURCE_PREFIX[source]
  if (!prefix) throw new Error(`不支持的音乐源：${source}`)
  if (!enabledSources.includes(source)) throw new Error(`这个令牌没有启用音乐源：${source}`)

  const quality = QUALITY_MAP[info && info.type]
  if (!quality) throw new Error(`不支持的音质：${info && info.type}`)

  const songmid = info && info.musicInfo && info.musicInfo.songmid
  if (songmid === undefined || songmid === null || songmid === '') {
    throw new Error('缺少歌曲 ID（musicInfo.songmid）')
  }

  const id = `${prefix}:${songmid}`
  const url = `${serverURL}/v1/track/url?id=${encodeURIComponent(id)}&quality=${encodeURIComponent(quality)}`

  const data = await requestJSON(url, {
    method: 'get',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      Accept: 'application/json',
      'User-Agent': 'lxmusic',
      'X-Wow-Client': 'lxmusic',
    },
    timeout: REQUEST_TIMEOUT_MS,
  })

  const audioURL = data && data.url
  if (typeof audioURL !== 'string' || !/^https?:\/\//i.test(audioURL)) {
    throw new Error('wow-server 没有返回合法的播放地址')
  }
  if (audioURL.length > MAX_AUDIO_URL_LENGTH) {
    throw new Error(`播放地址过长（${audioURL.length} > ${MAX_AUDIO_URL_LENGTH}），LX 无法接收`)
  }

  return audioURL
}

on(EVENT_NAMES.request, ({ source, action, info }) => {
  if (action !== 'musicUrl') {
    return Promise.reject(new Error(`不支持的 action：${action}`))
  }
  return getMusicUrl({ source, info }).catch(err => {
    if (typeof console !== 'undefined' && typeof console.error === 'function') {
      console.error(`[wow-lx] ${source} ${info && info.type}：`, err && err.message ? err.message : err)
    }
    return Promise.reject(err)
  })
})

const sources = {}
for (const source of enabledSources) {
  sources[source] = {
    name: SOURCE_NAME,
    type: 'music',
    actions: ['musicUrl'],
    qualitys: ['128k', '320k', 'flac', 'flac24bit'],
  }
}

send(EVENT_NAMES.inited, { sources })
