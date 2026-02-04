import { action } from '@zendesk/connector-sdk';

export const testAction = action({
  name: 'test_action',
  title: 'Test action',
  description: 'Test action',
  inputs: () => {
    return [
      {
        name: 'name',
        title: 'Name',
        description: 'Name',
        value_type: 'string',
        control_type: {
          type: 'text',
        },
        required: true,
      },
    ];
  },
  output: () => ({
    type: 'object',
    properties: {
      greeting: {
        type: 'string',
      },
    },
  }),
  execute: ({ inputs }) => {
    return {
      greeting: `Hello, ${inputs.name}!`,
    };
  },
});
