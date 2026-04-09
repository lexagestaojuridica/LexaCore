import https from 'https';

const options = {
    hostname: 'api.github.com',
    port: 443,
    path: '/user',
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
        console.log('User Status Code:', res.statusCode);
        console.log('User Response:', body);
    });
});

req.on('error', (e) => { console.error(e); });
req.end();

const optionsOrgs = { ...options, path: '/user/orgs' };
const reqOrgs = https.request(optionsOrgs, (res) => {
    let body = '';
    res.on('data', (d) => { body += d; });
    res.on('end', () => {
        console.log('Orgs Status Code:', res.statusCode);
        console.log('Orgs Response:', body);
    });
});
reqOrgs.on('error', (e) => { console.error(e); });
reqOrgs.end();
