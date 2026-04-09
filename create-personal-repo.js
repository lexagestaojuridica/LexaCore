import https from 'https';

const data = JSON.stringify({
    name: 'LexaCore',
    private: true,
    description: 'Repositório Core Lexa (Pessoal)'
});

const options = {
    hostname: 'api.github.com',
    port: 443,
    path: '/user/repos',
    method: 'POST',
    headers: {
        'Authorization': 'Bearer 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',
        'Accept': 'application/vnd.github.v3+json',
        'Content-Type': 'application/json',
        'Content-Length': data.length,
        'User-Agent': 'Antigravity-Internal'
    }
};

const req = https.request(options, (res) => {
    let body = '';
    res.on('data', (d) => { body += d; });
    res.on('end', () => {
        console.log('Status Code:', res.statusCode);
        console.log('Response:', body);
    });
});

req.on('error', (e) => { console.error(e); });
req.write(data);
req.end();
