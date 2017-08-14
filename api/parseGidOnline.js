// gidonline parser

const axios = require('axios');
const m3u8Parser = require('m3u8-parser');

function parserError(message, step, details) {
    const e = new Error(message);
    e.step = step;
    e.details = details;
    return e;
}


function extractVideoIframeSrc(html) {
    console.log(html);
    const rx = /<iframe.*?src\s*=\s*"(.*?)"/g;
    const m = rx.exec(html) || [];
    console.log(m);
    return m.slice(1).filter(u => u.indexOf('pandastream') > 0)[0];
}


function parse(url, clientIp) {
    return axios(url)
        .then(res => {
            const iframeUrl = extractVideoIframeSrc(res.data);

            if (iframeUrl) {
                return iframeUrl;
            }

            // sometimes they render div with class "ifram" and then replace it
            // with result of POST http://gidonline.club/trailer.php
            // handle this here
            // (in this case <meta id="meta" content="[trailerid]" /> included)

            const rx = /<div.*?class\s*=\s*"ifram"/g;
            const m = rx.test(res.data);
            if (!m) {
                throw parserError('Cannot find video iframe', 1, res.data);
            }

            // otherwise we found that div - now we need to extract trailer ID
            const rx2 = /<meta.*?id\s*=\s*"meta".*?content\s*=\s*"(.*?)"/g;
            const m2 = rx2.exec(res.data)[1];
            return axios.post(
                'http://gidonline.club/trailer.php',
                `id_post=${m2}`,
                {
                    headers: {
                        'Accept': '*/*',
                        'Referer': url,
                        'Content-Type': 'application/x-www-form-urlencoded',
                        'X-Requested-With': 'XMLHttpRequest',
                        'x-forwarded-for': clientIp + ''
                    }
                }
            )
            .then(res => {
               // console.log(res);
                return extractVideoIframeSrc(res.data);
            });
        })
        .then(iframeUrl => {
            if (!iframeUrl) {
                throw parserError('Cannot find video iframe', 2);
            }

            //iframeUrl = 'http://pandastream.cc/video/94919cdc2a131dab/iframe';

            console.log('STEP 1:', iframeUrl);

            return axios({
                method: 'GET',
                url: iframeUrl,
                headers: {
                    'Referer': 'http://gidonline.club',
                    'x-forwarded-for': clientIp + ''
                }
            });
        })
        .then(res => {
            let script = [];

            console.log(res.data);

            var lines = res.data.split('\n');

            //condition_detected
            script.push('var condition_detected = false;');

            // mw_key
            let start = res.data.indexOf('var mw_key');
            let end = start;
            for (let i = start; i > 0; i -= 1) {
                if (res.data[i - 1] === '}') {
                    start = i;
                    break;
                }
            }
            for (let i = end; i < res.data.length; i += 1) {
                if (res.data[i] === 'f' && res.data[i+1] === 'u' && res.data[i+2] === 'n' && res.data[i+3] === 'c' && res.data[i+4] === 't' && res.data[i+5] === 'i' && res.data[i+6] === 'o' && res.data[i+7] === 'n') {
                    end = i;
                    break;
                }
            }
            script.push(res.data.substr(start, end - start));

            // add some another weird key
            var rx = /setTimeout[\s\S]*{\s(.*window\[[\s\S]*?;)/g;
            script.push(rx.exec(res.data)[1]);

            // find out url var name
            rx = /'(\/manifests\/video\/.*?)'/g;
            var url = 'http://pandastream.cc' + rx.exec(res.data)[1];

            const window = {};
            eval(script.join(''));

            console.log(script.join(''));

            console.log(Object.keys(window));
            console.log(url);

            rx = /<meta\s*name\s*=\s*"csrf-token"\s*content\s*=\s*"(.*)"/g;
            var csrfToken = rx.exec(res.data)[1];

            console.log(csrfToken);

            rx = /'X-Access-Level':\s*'(.*?)'/g;
            var xAccessLevel = rx.exec(res.data)[1];

            console.log('STEP 2:', url);

           return axios.post(url, window[Object.keys(window)[0]], {
               headers: {
                   'Referer': 'http://pandastream.cc',
                   'X-CSRF-Token': csrfToken,
                   'X-Access-Level': xAccessLevel,
                   'X-Requested-With':'XMLHttpRequest',
                   'x-forwarded-for': clientIp + ''
                }
            });
        })
        .then(res => {
            //console.log(res.data);
            console.log('STEP 3:', res.data.mans);
            const urls = Object.keys(res.data.mans).map(key => ({ type: key.split('manifest_')[1], url: res.data.mans[key] }));
            const promises = urls.map(o => axios(o.url)
                .then(res => ({ type: o.type, url: o.url, data: res.data }))
                .catch(console.error));
            return Promise.all(promises);
        })
        .then(o => {
            return o
                .filter(i => i)
                .map(i => {
                    i.data = parseManifest(i.type, i.data);
                    return i;
                });
        });
}


function parseManifest(type, data) {
    if (type === 'm3u8') {
        const parser = new m3u8Parser.Parser();
        parser.push(data);
        parser.end();
        return parser.manifest.playlists.map(i => {
            return {
                title: `${i.attributes.RESOLUTION.width}x${i.attributes.RESOLUTION.width}, ${i.attributes.BANDWIDTH / 1000} KHz`,
                url: i.uri
            };
        });
    } if (type === 'mp4') {
        return Object.keys(data).map(k => ({ title: k, url: data[k] }));
    }
}


module.exports = parse;
