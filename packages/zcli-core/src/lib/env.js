"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.varExists = exports.EnvVars = void 0;
exports.EnvVars = {
    SUBDOMAIN: 'ZENDESK_SUBDOMAIN',
    DOMAIN: 'ZENDESK_DOMAIN',
    EMAIL: 'ZENDESK_EMAIL',
    PASSWORD: 'ZENDESK_PASSWORD',
    API_TOKEN: 'ZENDESK_API_TOKEN',
    OAUTH_TOKEN: 'ZENDESK_OAUTH_TOKEN',
    APP_ID: 'ZENDESK_APP_ID'
};
const varExists = (...args) => !args.filter(envVar => !process.env[envVar]).length;
exports.varExists = varExists;
