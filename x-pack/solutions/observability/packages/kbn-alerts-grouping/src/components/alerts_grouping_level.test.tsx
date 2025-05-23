/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, waitFor } from '@testing-library/react';
import { AlertsGroupingLevel, type AlertsGroupingLevelProps } from './alerts_grouping_level';
import { useGetAlertsGroupAggregationsQuery } from '@kbn/alerts-ui-shared';
import * as buildEsQueryModule from '@kbn/es-query/src/es_query/build_es_query';
import { mockGroupingProps } from '../mocks/grouping_props.mock';
import { groupingSearchResponse } from '../mocks/grouping_query.mock';

jest.mock('@kbn/alerts-ui-shared/src/common/hooks/use_get_alerts_group_aggregations_query', () => ({
  useGetAlertsGroupAggregationsQuery: jest.fn(),
}));

const mockUseGetAlertsGroupAggregationsQuery = useGetAlertsGroupAggregationsQuery as jest.Mock;
mockUseGetAlertsGroupAggregationsQuery.mockReturnValue({
  loading: false,
  data: groupingSearchResponse,
});

jest.mock('@kbn/alerts-ui-shared/src/common/hooks/use_alerts_data_view', () => ({
  useAlertDataView: jest.fn().mockReturnValue({ dataViews: [{ fields: [] }] }),
}));

jest.mock('../contexts/alerts_grouping_context', () => {
  const original = jest.requireActual('../contexts/alerts_grouping_context');
  return {
    ...original,
    useAlertsGroupingState: jest.fn(),
  };
});

const getGrouping = jest
  .fn()
  .mockImplementation(({ renderChildComponent }) => <span>{renderChildComponent()}</span>);

const mockGroupingLevelProps: Omit<AlertsGroupingLevelProps, 'children'> = {
  ...mockGroupingProps,
  getGrouping,
  onGroupClose: jest.fn(),
  pageIndex: 0,
  pageSize: 10,
  selectedGroup: 'selectedGroup',
  setPageIndex: jest.fn(),
  setPageSize: jest.fn(),
};

describe('AlertsGroupingLevel', () => {
  let buildEsQuerySpy: jest.SpyInstance;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  beforeAll(() => {
    buildEsQuerySpy = jest.spyOn(buildEsQueryModule, 'buildEsQuery');
  });

  it('should render', () => {
    const { getByTestId } = render(
      <AlertsGroupingLevel {...mockGroupingLevelProps}>
        {() => <span data-test-subj="grouping-level" />}
      </AlertsGroupingLevel>
    );
    expect(getByTestId('grouping-level')).toBeInTheDocument();
  });

  it('should account for global, default and parent filters', async () => {
    const globalFilter = { meta: { value: 'global', disabled: false } };
    const defaultFilter = { meta: { value: 'default' } };
    const parentFilter = { meta: { value: 'parent' } };
    render(
      <AlertsGroupingLevel
        {...mockGroupingLevelProps}
        globalFilters={[globalFilter]}
        defaultFilters={[defaultFilter]}
        parentGroupingFilter={[parentFilter]}
      >
        {() => <span data-test-subj="grouping-level" />}
      </AlertsGroupingLevel>
    );
    await waitFor(() =>
      expect(buildEsQuerySpy).toHaveBeenLastCalledWith(undefined, expect.anything(), [
        globalFilter,
        defaultFilter,
        parentFilter,
      ])
    );
  });

  it('should discard disabled global filters', async () => {
    const globalFilters = [
      { meta: { value: 'global1', disabled: false } },
      { meta: { value: 'global2', disabled: true } },
    ];
    render(
      <AlertsGroupingLevel {...mockGroupingLevelProps} globalFilters={globalFilters}>
        {() => <span data-test-subj="grouping-level" />}
      </AlertsGroupingLevel>
    );
    await waitFor(() =>
      expect(buildEsQuerySpy).toHaveBeenLastCalledWith(undefined, expect.anything(), [
        globalFilters[0],
      ])
    );
  });

  it('should call getGrouping with the right aggregations', () => {
    render(
      <AlertsGroupingLevel {...mockGroupingLevelProps}>
        {() => <span data-test-subj="grouping-level" />}
      </AlertsGroupingLevel>
    );

    expect(Object.keys(getGrouping.mock.calls[0][0].data)).toMatchObject(
      Object.keys(groupingSearchResponse.aggregations)
    );
  });

  it('should calls useGetAlertsGroupAggregationsQuery with correct props', () => {
    render(
      <AlertsGroupingLevel {...mockGroupingLevelProps}>
        {() => <span data-test-subj="grouping-level" />}
      </AlertsGroupingLevel>
    );

    expect(mockUseGetAlertsGroupAggregationsQuery.mock.calls).toMatchInlineSnapshot(`
      Array [
        Array [
          Object {
            "enabled": true,
            "http": Object {
              "get": [MockFunction],
            },
            "params": Object {
              "aggregations": Object {},
              "consumers": Array [
                "stackAlerts",
              ],
              "filters": Array [
                Object {
                  "bool": Object {
                    "filter": Array [],
                    "must": Array [],
                    "must_not": Array [],
                    "should": Array [],
                  },
                },
                Object {
                  "range": Object {
                    "kibana.alert.time_range": Object {
                      "gte": "2020-07-07T08:20:18.966Z",
                      "lte": "2020-07-08T08:20:18.966Z",
                    },
                  },
                },
              ],
              "groupByField": "selectedGroup",
              "pageIndex": 0,
              "pageSize": 10,
              "ruleTypeIds": Array [
                ".es-query",
              ],
            },
            "toasts": Object {
              "addDanger": [MockFunction],
            },
          },
        ],
      ]
    `);
  });
});
