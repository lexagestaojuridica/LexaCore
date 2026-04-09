import https from 'https';

const options = {
    hostname: 'api.github.com',
    port: 443,
    path: '/user/repos?type=owner&sort=updated',
    method: 'GET',
    headers: {
        'Authorization': 'Bearer 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',
        'Accept': 'application/vnd.github.v3+json',
        'User-Agent': 'Antigravity-Internal'
    }
};

const req = https.request(options, (res) => {
    let body = '';
    res.on('data', (d) => { body += d; });
    res.on('end', () => {
        console.log('Status Code:', res.statusCode);
        const repos = JSON.parse(body);
        if (Array.isArray(repos)) {
            repos.forEach(r => console.log(`- ${r.full_name} (${r.html_url})`));
        } else {
            console.log('Response:', body);
        }
    });
});

req.on('error', (e) => { console.error(e); });
req.end();
