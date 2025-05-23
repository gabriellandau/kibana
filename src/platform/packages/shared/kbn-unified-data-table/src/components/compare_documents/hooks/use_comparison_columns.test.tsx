/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import {
  DEFAULT_COLUMN_WIDTH,
  FIELD_COLUMN_NAME,
  FIELD_COLUMN_WIDTH,
  useComparisonColumns,
} from './use_comparison_columns';
import type { EuiDataGridColumn, EuiDataGridColumnActions } from '@elastic/eui';
import { render, screen, renderHook } from '@testing-library/react';
import React from 'react';
import userEvent from '@testing-library/user-event';
import { generateEsHits } from '@kbn/discover-utils/src/__mocks__';
import { dataViewWithTimefieldMock } from '../../../../__mocks__/data_view_with_timefield';
import { buildDataTableRecord } from '@kbn/discover-utils';
import type { DataTableRecord } from '@kbn/discover-utils/types';

type DataGridColumn = Partial<Omit<EuiDataGridColumn, 'actions'>> &
  Pick<EuiDataGridColumn, 'id' | 'displayAsText'> & {
    actions?: Partial<Omit<EuiDataGridColumnActions, 'additional'>>;
  };

const getComparisonColumn = ({
  column,
  includePinAction,
  includeRemoveAction,
}: {
  column: DataGridColumn;
  includePinAction?: boolean;
  includeRemoveAction?: boolean;
}): EuiDataGridColumn => {
  const additional: EuiDataGridColumnActions['additional'] = [];
  if (includePinAction) {
    additional.push({
      iconType: 'pin',
      label: 'Pin for comparison',
      size: 'xs',
      onClick: expect.any(Function),
    });
  }
  if (includeRemoveAction) {
    additional.push({
      iconType: 'cross',
      label: 'Remove from comparison',
      size: 'xs',
      onClick: expect.any(Function),
    });
  }
  return {
    display: undefined,
    initialWidth: DEFAULT_COLUMN_WIDTH,
    isSortable: false,
    isExpandable: false,
    ...column,
    actions: {
      showHide: false,
      showMoveLeft: false,
      showMoveRight: false,
      showSortAsc: false,
      showSortDesc: false,
      ...column.actions,
      additional,
    },
  };
};

const docs = generateEsHits(dataViewWithTimefieldMock, 4).map((hit) =>
  buildDataTableRecord(hit, dataViewWithTimefieldMock)
);

const defaultGetDocById = (id: string) => docs.find((doc) => doc.raw._id === id);

const fieldColumnId = 'fieldColumnId';
const selectedDocIds = ['0', '1', '2', '3'];

const renderColumns = ({
  wrapperWidth,
  isPlainRecord = false,
  getDocById = defaultGetDocById,
}: {
  wrapperWidth?: number;
  isPlainRecord?: boolean;
  getDocById?: (id: string) => DataTableRecord | undefined;
} = {}) => {
  const wrapper = document.createElement('div');
  if (wrapperWidth) {
    Object.defineProperty(wrapper, 'offsetWidth', { value: wrapperWidth });
  }
  const replaceSelectedDocs = jest.fn();
  const {
    result: { current: columns },
  } = renderHook(() =>
    useComparisonColumns({
      wrapper,
      isPlainRecord,
      fieldColumnId,
      selectedDocIds,
      getDocById,
      replaceSelectedDocs,
    })
  );
  return { columns, replaceSelectedDocs };
};

describe('useComparisonColumns', () => {
  it('should return comparison columns', async () => {
    const { columns, replaceSelectedDocs } = renderColumns();
    expect(columns).toEqual([
      {
        id: fieldColumnId,
        displayAsText: FIELD_COLUMN_NAME,
        initialWidth: FIELD_COLUMN_WIDTH,
        isSortable: false,
        isExpandable: false,
        actions: false,
      },
      getComparisonColumn({
        column: {
          id: selectedDocIds[0],
          display: expect.anything(),
          displayAsText: `Pinned document: ${selectedDocIds[0]}`,
        },
        includeRemoveAction: true,
      }),
      getComparisonColumn({
        column: {
          id: selectedDocIds[1],
          display: selectedDocIds[1],
          displayAsText: `Comparison document: ${selectedDocIds[1]}`,
          actions: {
            showMoveRight: true,
          },
        },
        includePinAction: true,
        includeRemoveAction: true,
      }),
      getComparisonColumn({
        column: {
          id: selectedDocIds[2],
          display: selectedDocIds[2],
          displayAsText: `Comparison document: ${selectedDocIds[2]}`,
          actions: {
            showMoveLeft: true,
            showMoveRight: true,
          },
        },
        includePinAction: true,
        includeRemoveAction: true,
      }),
      getComparisonColumn({
        column: {
          id: selectedDocIds[3],
          display: selectedDocIds[3],
          displayAsText: `Comparison document: ${selectedDocIds[3]}`,
          actions: {
            showMoveLeft: true,
          },
        },
        includePinAction: true,
        includeRemoveAction: true,
      }),
    ]);
    expect(columns[1].display).toMatchInlineSnapshot(`
      <EuiFlexGroup
        alignItems="center"
        gutterSize="xs"
        responsive={false}
      >
        <EuiFlexItem
          grow={false}
        >
          <EuiIcon
            type="pinFilled"
          />
        </EuiFlexItem>
        <EuiFlexItem
          grow={false}
        >
          0
        </EuiFlexItem>
      </EuiFlexGroup>
    `);
    const actions = columns[2].actions as EuiDataGridColumnActions;
    const pinAction = actions.additional?.[0].onClick;
    const removeAction = actions.additional?.[1].onClick;
    render(<button onClick={pinAction} data-test-subj="pin" />);
    await userEvent.click(screen.getByTestId('pin'));
    expect(replaceSelectedDocs).toHaveBeenCalledTimes(1);
    expect(replaceSelectedDocs).toHaveBeenLastCalledWith(['1', '0', '2', '3']);
    render(<button onClick={removeAction} data-test-subj="remove" />);
    await userEvent.click(screen.getByTestId('remove'));
    expect(replaceSelectedDocs).toHaveBeenCalledTimes(2);
    expect(replaceSelectedDocs).toHaveBeenLastCalledWith(['0', '2', '3']);
  });

  it('should not set column widths if there is sufficient space', () => {
    const { columns } = renderColumns({
      wrapperWidth: FIELD_COLUMN_WIDTH + selectedDocIds.length * DEFAULT_COLUMN_WIDTH,
    });
    expect(columns[0].initialWidth).toBe(FIELD_COLUMN_WIDTH);
    expect(columns[1].initialWidth).toBe(undefined);
    expect(columns[2].initialWidth).toBe(undefined);
    expect(columns[3].initialWidth).toBe(undefined);
    expect(columns[4].initialWidth).toBe(undefined);
  });

  it('should use result column display for plain records', () => {
    const { columns } = renderColumns({ isPlainRecord: true });
    expect(columns[1].displayAsText).toBe(`Pinned result: 1`);
    expect(columns[2].displayAsText).toBe(`Comparison result: 2`);
    expect(columns[3].displayAsText).toBe(`Comparison result: 3`);
    expect(columns[4].displayAsText).toBe(`Comparison result: 4`);
  });

  it('should skip columns for missing docs', () => {
    const getDocById = (id: string) =>
      id === selectedDocIds[1] ? undefined : defaultGetDocById(id);
    const { columns } = renderColumns({ getDocById });
    expect(columns).toHaveLength(4);
    expect(columns[1].displayAsText).toBe(`Pinned document: ${selectedDocIds[0]}`);
    expect(columns[2].displayAsText).toBe(`Comparison document: ${selectedDocIds[2]}`);
    expect(columns[3].displayAsText).toBe(`Comparison document: ${selectedDocIds[3]}`);
  });
});
