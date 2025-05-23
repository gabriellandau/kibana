/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SLODefinitionResponse } from '@kbn/slo-schema';
import type { StoryFn } from '@storybook/react';
import React from 'react';
import { KibanaReactStorybookDecorator } from '../../utils/kibana_react.storybook_decorator';
import { SloSelector as Component } from './slo_selector';

export default {
  component: Component,
  title: 'app/SLO/BurnRateRule',
  decorators: [KibanaReactStorybookDecorator],
};

const Template: StoryFn<typeof Component> = () => (
  // eslint-disable-next-line no-console
  <Component onSelected={(slo: SLODefinitionResponse | undefined) => console.log(slo)} />
);
const defaultProps = {};

export const SloSelector = {
  render: Template,
  args: defaultProps,
};
