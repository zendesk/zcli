import { authentication } from '@zendesk/connector-sdk';

const authConfig = authentication({
  type: 'oauth2',
  grant_type: 'authorization_code',
  inputs: [],
  allowed_domain: 'api.starter.com',
});

export default authConfig;
