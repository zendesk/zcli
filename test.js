const fetch = require("node-fetch");
const fs = require('fs');

const subdomain = process.env.ZENDESK_SUBDOMAIN;
const email = process.env.ZENDESK_EMAIL;
const password = process.env.ZENDESK_PASSWORD;
const creds = btoa(email + ':' + password);

async function main() {
  const response = await fetch(`https://${subdomain}.zendesk.com/api/v2/account/settings.json`, {
    method: 'GET',
    headers: new Headers({
      'Authorization': 'Basic '+creds,
    })
  });

  const data = await response.json();

  console.log(data);
}

main();
