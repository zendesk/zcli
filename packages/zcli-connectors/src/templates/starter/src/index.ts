import { manifest } from '@zendesk/connector-sdk';
import { testAction } from './actions/test-action';
import authConfig from './auth/config';

const connector = manifest({
  name: 'starter',
  title: 'Starter Connector',
  description: 'Starter Connector',
  author: 'starter-author',
  authentication: authConfig,
  actions: [testAction],
});

export default connector;
