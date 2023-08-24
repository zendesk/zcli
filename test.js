const axios = require("axios");
const fs = require('fs');

const subdomain = process.env.ZENDESK_SUBDOMAIN;
const email = process.env.ZENDESK_EMAIL;
const password = process.env.ZENDESK_PASSWORD;
const creds = btoa(email + ':' + password);

const config = {
  method: "GET",
  url: `https://${subdomain}.zendesk.com/api/v2/apps/owned.json`,
  headers: {
    "Authorization": `Basic ${creds}`,
  },
};


axios(config)
  .then(function (response) {
    console.log(JSON.stringify(response.data));
  })
  .catch(function (error) {
    console.log(error)
  });
