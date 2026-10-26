(function () {
  const PLUGIN_INFO = JSON.stringify({
      uid: '85e91dc3-e306-4d95-b611-d32e35b3d59d',
      name: '聆澜音源(公益版)',
      version: 'v8.9.2',
      description: '支持所有平台音质以当前密钥开放配置为准 作者：时迁酱&guoyue2010',
      support: ["kw","mg","wy"]
  });
  const list = ['standard','exhigh','lossless','lossless+','hires','atmos','master'];
  const names = ['standard','exhigh','lossless','lossless+','hires','atmos','master'];
  const musicQuality = {"kw":["128k","320k","flac"],"mg":["128k","320k","flac"],"wy":["128k","320k","flac"]};
  const sources = {};
  for (let source in musicQuality) {
      sources[source] = { qualitys: musicQuality[source] };
  }
  function pickQuality(source, quality) {
      const supported = sources[source]?.qualitys;
      if (!supported || supported.length === 0) return list[0];
      const idx = names.indexOf(quality);
      const q = list[idx] || list[0];
      return supported.includes(q) ? q : supported[supported.length - 1];
  }
  async function getMusicUrl(source,id,quality,key="CERU_KEY-23c1ff2bda92b8e1c96da160c8a29b08124b68841e5ca7ae") {
      quality = pickQuality(source,quality);
      const url = `https://source.shiqianjiang.cn/api/music/url?source=${source}&songId=${id}&quality=${quality}`;
      const headers = {
          'Content-Type': 'application/json',
          'X-API-Key': 'CERU_KEY-23c1ff2bda92b8e1c96da160c8a29b08124b68841e5ca7ae',
          'User-Agent': 'CeruMusic-Plugin/v1'
      };
      try {
          const resultStr = await customFetch(url, { method: 'GET', headers: headers });
          const data = JSON.parse(resultStr);
          return data['url'];
      } catch (error) {
          try { return await getMusicUrl(source,id,'exhigh'); }
          catch (error) { throw error; }
      }
  }
  globalThis.MusicPlugin = { info: PLUGIN_INFO, getMusicUrl };
})();
;(function (allowed) {
  const plugin = globalThis.MusicPlugin;
  const aliases = { standard: '128k', exhigh: '320k', lossless: 'flac', 'lossless+': 'flac24bit', hires: 'hires', atmos: 'atmos', master: 'master' };
  const info = JSON.parse(plugin.info);
  info.support = Object.keys(allowed);
  plugin.info = JSON.stringify(info);
  // The legacy picker compared client aliases to API quality names and always picked the last item.
  plugin.getMusicUrl = async function (source, id, quality) {
    const canonical = aliases[quality] || quality;
    if (!allowed[source] || !allowed[source].includes(canonical)) throw new Error('当前密钥不支持此平台或音质');
    const response = await customFetch('https://source.shiqianjiang.cn/api/music/url?source=' + encodeURIComponent(source) + '&songId=' + encodeURIComponent(id) + '&quality=' + encodeURIComponent(canonical), {
      method: 'GET', headers: { 'Content-Type': 'application/json', 'X-API-Key': 'CERU_KEY-23c1ff2bda92b8e1c96da160c8a29b08124b68841e5ca7ae', 'User-Agent': 'CeruMusic-Plugin/v1' }
    });
    const data = JSON.parse(response);
    if (!data.url || (data.code !== undefined && data.code !== 0 && data.code !== 200)) throw new Error(data.message || '获取音乐链接失败');
    return data.url;
  };
}
)({"kw":["128k","320k","flac"],"mg":["128k","320k","flac"],"wy":["128k","320k","flac"]});
