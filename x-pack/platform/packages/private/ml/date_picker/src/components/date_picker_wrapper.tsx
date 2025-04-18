/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FC } from 'react';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Subscription } from 'rxjs';
import { debounce } from 'lodash';

import type { OnRefreshProps, OnTimeChangeProps } from '@elastic/eui';
import {
  useIsWithinMaxBreakpoint,
  EuiButton,
  EuiFlexGroup,
  EuiFlexItem,
  EuiSuperDatePicker,
  type EuiSuperDatePickerProps,
  EuiToolTip,
} from '@elastic/eui';

import type { TimeRange } from '@kbn/es-query';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import type { TimeHistoryContract } from '@kbn/data-plugin/public';
import { useUrlState } from '@kbn/ml-url-state';
import { toMountPoint } from '@kbn/react-kibana-mount';

import { useRefreshIntervalUpdates, useTimeRangeUpdates } from '../hooks/use_timefilter';
import { useDatePickerContext } from '../hooks/use_date_picker_context';
import { mlTimefilterRefresh$ } from '../services/timefilter_refresh_service';

const DEFAULT_REFRESH_INTERVAL_MS = 5000;

interface TimePickerQuickRange {
  from: string;
  to: string;
  display: string;
}

interface Duration {
  start: string;
  end: string;
}

interface RefreshInterval {
  pause: boolean;
  value: number;
}

function getRecentlyUsedRangesFactory(timeHistory: TimeHistoryContract) {
  return function (): Duration[] {
    return (
      timeHistory.get()?.map(({ from, to }: TimeRange) => {
        return {
          start: from,
          end: to,
        };
      }) ?? []
    );
  };
}

function updateLastRefresh(timeRange?: OnRefreshProps) {
  mlTimefilterRefresh$.next({ lastRefresh: Date.now(), ...(timeRange ? { timeRange } : {}) });
}

/**
 * DatePickerWrapper React Component props interface
 */
interface DatePickerWrapperProps {
  /**
   * Boolean flag to be passed on to `EuiSuperDatePicker`.
   */
  isAutoRefreshOnly?: boolean;
  /**
   * Boolean flag to indicate loading state.
   */
  isLoading?: boolean;
  /**
   * Boolean flag to enforce showing/hiding the refresh button.
   */
  showRefresh?: boolean;
  /**
   * Width setting to be passed on to `EuiSuperDatePicker`
   */
  width?: EuiSuperDatePickerProps['width'];
  /**
   * Boolean flag to disable the date picker
   */
  isDisabled?: boolean;
  /**
   * Boolean flag to force change from 'Refresh' to 'Update' state
   */
  needsUpdate?: boolean;
  /**
   * Callback function that gets called
   * when EuiSuperDatePicker's 'Refresh'|'Update' button is clicked
   */
  onRefresh?: () => void;
  /**
   * Tooltip message for the update button
   */
  tooltipMessage?: string;
  /**
   * Data test subject for the refresh button
   */
  dataTestSubj?: string;
}

/**
 * DatePickerWrapper React Component
 *
 * @type {FC<DatePickerWrapperProps>}
 * @param props - `DatePickerWrapper` component props
 * @returns {React.ReactElement} The DatePickerWrapper component.
 */
export const DatePickerWrapper: FC<DatePickerWrapperProps> = (props) => {
  const {
    isAutoRefreshOnly,
    isLoading = false,
    showRefresh,
    width,
    isDisabled = false,
    needsUpdate,
    onRefresh,
    tooltipMessage,
    dataTestSubj = 'mlDatePickerRefreshPageButton',
  } = props;
  const {
    data,
    notifications: { toasts },
    uiSettings: config,
    uiSettingsKeys,
    userProfile,
    theme,
    i18n: i18nStart,
  } = useDatePickerContext();

  const isWithinLBreakpoint = useIsWithinMaxBreakpoint('l');

  const { timefilter, history } = data.query.timefilter;

  const [globalState, setGlobalState] = useUrlState('_g');
  const getRecentlyUsedRanges = getRecentlyUsedRangesFactory(history);

  const timeFilterRefreshInterval = useRefreshIntervalUpdates();
  const time = useTimeRangeUpdates();

  useEffect(
    function syncTimeRangeFromUrlState() {
      if (globalState?.time !== undefined) {
        timefilter.setTime({
          from: globalState.time.from,
          to: globalState.time.to,
        });
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [globalState?.time?.from, globalState?.time?.to, globalState?.time?.ts]
  );

  useEffect(
    function syncRefreshIntervalFromUrlState() {
      if (globalState?.refreshInterval !== undefined) {
        timefilter.setRefreshInterval({
          pause: !!globalState?.refreshInterval?.pause,
          value: globalState?.refreshInterval?.value,
        });
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [globalState?.refreshInterval]
  );

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const setRefreshInterval = useCallback(
    debounce((refreshIntervalUpdate: RefreshInterval) => {
      setGlobalState('refreshInterval', refreshIntervalUpdate, true);
    }, 200),
    [setGlobalState]
  );

  const [recentlyUsedRanges, setRecentlyUsedRanges] = useState(getRecentlyUsedRanges());
  const [isAutoRefreshSelectorEnabled, setIsAutoRefreshSelectorEnabled] = useState(
    timefilter.isAutoRefreshSelectorEnabled()
  );
  const [isTimeRangeSelectorEnabled, setIsTimeRangeSelectorEnabled] = useState(
    timefilter.isTimeRangeSelectorEnabled()
  );

  const refreshInterval = timeFilterRefreshInterval;

  useEffect(
    function warnAboutShortRefreshInterval() {
      const isResolvedFromUrlState = !!globalState?.refreshInterval;
      const isTooShort = refreshInterval.value < DEFAULT_REFRESH_INTERVAL_MS;

      // Only warn about short interval with enabled auto-refresh.
      if (!isTooShort || refreshInterval.pause) return;

      toasts.addWarning(
        {
          title: isResolvedFromUrlState
            ? i18n.translate('xpack.ml.datePicker.shortRefreshIntervalURLWarningMessage', {
                defaultMessage:
                  'The refresh interval in the URL is shorter than the minimum supported interval.',
              })
            : i18n.translate('xpack.ml.datePicker.shortRefreshIntervalTimeFilterWarningMessage', {
                defaultMessage:
                  'The refresh interval in Advanced Settings is shorter than the minimum supported interval.',
              }),
          text: toMountPoint(
            <EuiButton
              onClick={setRefreshInterval.bind(null, {
                pause: refreshInterval.pause,
                value: DEFAULT_REFRESH_INTERVAL_MS,
              })}
            >
              <FormattedMessage
                id="xpack.ml.datePicker.pageRefreshResetButton"
                defaultMessage="Set to {defaultInterval}"
                values={{
                  defaultInterval: `${DEFAULT_REFRESH_INTERVAL_MS / 1000}s`,
                }}
              />
            </EuiButton>,
            { theme, i18n: i18nStart, userProfile }
          ),
        },
        { toastLifeTimeMs: 30000 }
      );
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [
      // eslint-disable-next-line react-hooks/exhaustive-deps
      JSON.stringify(refreshInterval),
      // eslint-disable-next-line react-hooks/exhaustive-deps
      JSON.stringify(globalState?.refreshInterval),
      setRefreshInterval,
    ]
  );

  const dateFormat = config.get('dateFormat');
  const timePickerQuickRanges = config.get<TimePickerQuickRange[]>(
    uiSettingsKeys.TIMEPICKER_QUICK_RANGES
  );

  const commonlyUsedRanges = useMemo(
    () =>
      timePickerQuickRanges.map(({ from, to, display }) => ({
        start: from,
        end: to,
        label: display,
      })),
    [timePickerQuickRanges]
  );

  useEffect(() => {
    const subscriptions = new Subscription();

    const enabledUpdated$ = timefilter.getEnabledUpdated$();
    if (enabledUpdated$ !== undefined) {
      subscriptions.add(
        enabledUpdated$.subscribe((w) => {
          setIsAutoRefreshSelectorEnabled(timefilter.isAutoRefreshSelectorEnabled());
          setIsTimeRangeSelectorEnabled(timefilter.isTimeRangeSelectorEnabled());
        })
      );
    }

    return function cleanup() {
      subscriptions.unsubscribe();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const updateTimeFilter = useCallback(
    ({ start, end }: OnTimeChangeProps) => {
      setRecentlyUsedRanges(getRecentlyUsedRanges());
      setGlobalState('time', {
        from: start,
        to: end,
        ...(start === 'now' || end === 'now' ? { ts: Date.now() } : {}),
      });
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [setGlobalState]
  );

  function updateInterval({
    isPaused: pause,
    refreshInterval: value,
  }: {
    isPaused: boolean;
    refreshInterval: number;
  }) {
    if (pause === false && value <= 0) {
      setRefreshInterval({ pause, value: 5000 });
    }
    setRefreshInterval({ pause, value });
  }

  const handleRefresh = useCallback(() => {
    updateLastRefresh();
    if (onRefresh) {
      onRefresh();
    }
  }, [onRefresh]);
  const flexItems = (
    <>
      <EuiFlexItem>
        <EuiSuperDatePicker
          isLoading={isLoading}
          start={time.from}
          end={time.to}
          isPaused={refreshInterval.pause}
          isAutoRefreshOnly={!isTimeRangeSelectorEnabled || isAutoRefreshOnly}
          refreshInterval={refreshInterval.value || DEFAULT_REFRESH_INTERVAL_MS}
          onTimeChange={updateTimeFilter}
          onRefresh={handleRefresh}
          onRefreshChange={updateInterval}
          recentlyUsedRanges={recentlyUsedRanges}
          dateFormat={dateFormat}
          commonlyUsedRanges={commonlyUsedRanges}
          isDisabled={isDisabled}
          updateButtonProps={{
            iconOnly: isWithinLBreakpoint,
            fill: false,
            ...(needsUpdate ? { needsUpdate } : {}),
          }}
          width={width}
        />
      </EuiFlexItem>
      {showRefresh === true || !isTimeRangeSelectorEnabled ? (
        <EuiFlexItem grow={false}>
          <EuiToolTip content={tooltipMessage}>
            <EuiButton
              fill={false}
              color={needsUpdate ? 'accentSecondary' : 'primary'}
              iconType={needsUpdate ? 'kqlFunction' : 'refresh'}
              onClick={handleRefresh}
              data-test-subj={`${dataTestSubj}${isLoading ? ' loading' : ' loaded'}`}
              isLoading={isLoading}
              isDisabled={isDisabled}
            >
              {needsUpdate ? (
                <FormattedMessage
                  id="xpack.ml.datePicker.pageUpdateButton"
                  defaultMessage="Update"
                />
              ) : (
                <FormattedMessage
                  id="xpack.ml.datePicker.pageRefreshButton"
                  defaultMessage="Refresh"
                />
              )}
            </EuiButton>
          </EuiToolTip>
        </EuiFlexItem>
      ) : null}
    </>
  );

  const flexGroup = !isTimeRangeSelectorEnabled || isAutoRefreshOnly === true;

  const wrapped = flexGroup ? (
    <EuiFlexGroup gutterSize="s" alignItems="center">
      {flexItems}
    </EuiFlexGroup>
  ) : (
    flexItems
  );

  return isAutoRefreshSelectorEnabled || isTimeRangeSelectorEnabled ? wrapped : null;
};
