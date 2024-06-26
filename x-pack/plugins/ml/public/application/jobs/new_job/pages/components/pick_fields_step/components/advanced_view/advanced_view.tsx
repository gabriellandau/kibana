/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FC } from 'react';
import React, { Fragment, useEffect, useState } from 'react';
import { EuiHorizontalRule } from '@elastic/eui';

import { AdvancedDetectors } from './metric_selection';
import { AdvancedDetectorsSummary } from './metric_selection_summary';
import { AdvancedSettings } from './settings';
import { ExtraSettings } from './extra';

interface Props {
  isActive: boolean;
  setCanProceed?: (proceed: boolean) => void;
}

export const AdvancedView: FC<Props> = ({ isActive, setCanProceed }) => {
  const [metricsValid, setMetricValid] = useState(false);
  const [settingsValid, setSettingsValid] = useState(false);

  useEffect(() => {
    if (typeof setCanProceed === 'function') {
      setCanProceed(metricsValid && settingsValid);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [metricsValid, settingsValid]);

  return (
    <Fragment>
      {isActive === false ? (
        <AdvancedDetectorsSummary />
      ) : (
        <Fragment>
          <ExtraSettings />
          <EuiHorizontalRule margin="l" />
          <AdvancedDetectors setIsValid={setMetricValid} />
          <EuiHorizontalRule margin="l" />
          <AdvancedSettings setIsValid={setSettingsValid} />
        </Fragment>
      )}
    </Fragment>
  );
};
