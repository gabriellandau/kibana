/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, useCallback } from 'react';
import { EuiToolTip, EuiButtonIcon } from '@elastic/eui';
import * as i18n from '../translations';
import { useCaseViewNavigation, useCaseViewParams } from '../../../common/navigation';
import { CASE_VIEW_PAGE_TABS } from '../../../../common/types';

interface UserActionShowAlertProps {
  id: string;
  alertId: string;
  index: string;
  onShowAlertDetails?: (alertId: string, index: string) => void;
}

const UserActionShowAlertComponent = ({
  id,
  alertId,
  index,
  onShowAlertDetails,
}: UserActionShowAlertProps) => {
  const { navigateToCaseView } = useCaseViewNavigation();
  const { detailName } = useCaseViewParams();

  const onClick = useCallback(() => {
    if (onShowAlertDetails) {
      onShowAlertDetails(alertId, index);
    } else {
      navigateToCaseView({ detailName, tabId: CASE_VIEW_PAGE_TABS.ALERTS });
    }
  }, [alertId, detailName, index, navigateToCaseView, onShowAlertDetails]);

  return (
    <EuiToolTip position="top" content={<p>{i18n.SHOW_ALERT_TOOLTIP}</p>}>
      <EuiButtonIcon
        aria-label={i18n.SHOW_ALERT_TOOLTIP}
        data-test-subj={`comment-action-show-alert-${id}`}
        onClick={onClick}
        iconType="arrowRight"
        id={`${id}-show-alert`}
      />
    </EuiToolTip>
  );
};
UserActionShowAlertComponent.displayName = 'UserActionShowAlert';

export const UserActionShowAlert = memo(UserActionShowAlertComponent);
