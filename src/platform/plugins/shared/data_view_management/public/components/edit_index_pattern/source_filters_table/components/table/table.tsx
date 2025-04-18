/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { Component } from 'react';

import {
  keys,
  EuiBasicTableColumn,
  EuiInMemoryTable,
  EuiFieldText,
  EuiButtonIcon,
  RIGHT_ALIGNMENT,
} from '@elastic/eui';

import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import { DataView } from '@kbn/data-views-plugin/public';
import {
  withEuiTablePersist,
  type EuiTablePersistInjectedProps,
} from '@kbn/shared-ux-table-persist';

import { SourceFiltersTableFilter } from '../../types';

const filterHeader = i18n.translate(
  'indexPatternManagement.editIndexPattern.source.table.filterHeader',
  {
    defaultMessage: 'Filter',
  }
);

const filterDescription = i18n.translate(
  'indexPatternManagement.editIndexPattern.source.table.filterDescription',
  { defaultMessage: 'Filter name' }
);

const matchesHeader = i18n.translate(
  'indexPatternManagement.editIndexPattern.source.table.matchesHeader',
  {
    defaultMessage: 'Matches',
  }
);

const matchesDescription = i18n.translate(
  'indexPatternManagement.editIndexPattern.source.table.matchesDescription',
  { defaultMessage: 'Language used for the field' }
);

const editAria = i18n.translate('indexPatternManagement.editIndexPattern.source.table.editAria', {
  defaultMessage: 'Edit',
});

const saveAria = i18n.translate('indexPatternManagement.editIndexPattern.source.table.saveAria', {
  defaultMessage: 'Save',
});

const deleteAria = i18n.translate(
  'indexPatternManagement.editIndexPattern.source.table.deleteAria',
  {
    defaultMessage: 'Delete',
  }
);

const cancelAria = i18n.translate(
  'indexPatternManagement.editIndexPattern.source.table.cancelAria',
  {
    defaultMessage: 'Cancel',
  }
);

const PAGE_SIZE_OPTIONS = [5, 10, 25, 50];

export interface TableProps {
  indexPattern: DataView;
  items: SourceFiltersTableFilter[];
  deleteFilter: Function;
  fieldWildcardMatcher: Function;
  saveFilter: (filter: SourceFiltersTableFilter) => void;
  isSaving: boolean;
}

export interface TableState {
  editingFilterId: string | number;
  editingFilterValue: string;
}

class TableClass extends Component<
  TableProps & EuiTablePersistInjectedProps<SourceFiltersTableFilter>,
  TableState
> {
  constructor(props: TableProps & EuiTablePersistInjectedProps<SourceFiltersTableFilter>) {
    super(props);
    this.state = {
      editingFilterId: '',
      editingFilterValue: '',
    };
  }

  startEditingFilter = (
    editingFilterId: TableState['editingFilterId'],
    editingFilterValue: TableState['editingFilterValue']
  ) => this.setState({ editingFilterId, editingFilterValue });

  stopEditingFilter = () => this.setState({ editingFilterId: '' });
  onEditingFilterChange = (e: React.ChangeEvent<HTMLInputElement>) =>
    this.setState({ editingFilterValue: e.target.value });

  onEditFieldKeyDown = ({ key }: React.KeyboardEvent<HTMLInputElement>) => {
    if (keys.ENTER === key && this.state.editingFilterId && this.state.editingFilterValue) {
      this.props.saveFilter({
        clientId: this.state.editingFilterId,
        value: this.state.editingFilterValue,
      });
      this.stopEditingFilter();
    }
    if (keys.ESCAPE === key) {
      this.stopEditingFilter();
    }
  };

  getColumns(): Array<EuiBasicTableColumn<SourceFiltersTableFilter>> {
    const { deleteFilter, fieldWildcardMatcher, indexPattern, saveFilter } = this.props;

    return [
      {
        field: 'value',
        name: filterHeader,
        description: filterDescription,
        dataType: 'string',
        sortable: true,
        render: (value, filter) => {
          if (this.state.editingFilterId && this.state.editingFilterId === filter.clientId) {
            return (
              <EuiFieldText
                autoFocus
                value={this.state.editingFilterValue}
                onChange={this.onEditingFilterChange}
                onKeyDown={this.onEditFieldKeyDown}
                data-test-subj={`filter_input_${value}`}
              />
            );
          }

          return <span>{value}</span>;
        },
      },
      {
        field: 'value',
        name: matchesHeader,
        description: matchesDescription,
        dataType: 'string',
        sortable: true,
        render: (value, filter) => {
          const wildcardMatcher = fieldWildcardMatcher([
            this.state.editingFilterId === filter.clientId ? this.state.editingFilterValue : value,
          ]);
          const matches = indexPattern
            .getNonScriptedFields()
            .map((currentFilter) => currentFilter.name)
            .filter(wildcardMatcher)
            .sort();

          if (matches.length) {
            return <span>{matches.join(', ')}</span>;
          }

          return (
            <em>
              <FormattedMessage
                id="indexPatternManagement.editIndexPattern.source.table.notMatchedLabel"
                defaultMessage="The source filter doesn't match any known fields."
              />
            </em>
          );
        },
      },
      {
        name: '',
        align: RIGHT_ALIGNMENT,
        width: '100',
        render: (filter: SourceFiltersTableFilter) => {
          if (this.state.editingFilterId === filter.clientId) {
            return (
              <>
                <EuiButtonIcon
                  size="s"
                  onClick={() => {
                    saveFilter({
                      clientId: this.state.editingFilterId,
                      value: this.state.editingFilterValue,
                    });
                    this.stopEditingFilter();
                  }}
                  iconType="checkInCircleFilled"
                  aria-label={saveAria}
                  data-test-subj={`save_filter-${filter.value}`}
                />
                <EuiButtonIcon
                  size="s"
                  onClick={() => {
                    this.stopEditingFilter();
                  }}
                  iconType="cross"
                  aria-label={cancelAria}
                />
              </>
            );
          }

          return (
            <>
              <EuiButtonIcon
                size="s"
                onClick={() => this.startEditingFilter(filter.clientId, filter.value)}
                iconType="pencil"
                aria-label={editAria}
                data-test-subj={`edit_filter-${filter.value}`}
              />
              <EuiButtonIcon
                size="s"
                color="danger"
                onClick={() => deleteFilter(filter)}
                iconType="trash"
                aria-label={deleteAria}
              />
            </>
          );
        },
      },
    ];
  }

  render() {
    const {
      items,
      isSaving,
      euiTablePersist: { pageSize, sorting, onTableChange },
    } = this.props;
    const columns = this.getColumns();
    const pagination = {
      pageSize,
      pageSizeOptions: PAGE_SIZE_OPTIONS,
    };

    return (
      <EuiInMemoryTable
        loading={isSaving}
        items={items}
        columns={columns}
        pagination={pagination}
        sorting={sorting}
        onTableChange={onTableChange}
      />
    );
  }
}

export const TableWithoutPersist = TableClass; // For testing purposes

export const Table = withEuiTablePersist(TableClass, {
  tableId: 'dataViewsSourceFilters',
  pageSizeOptions: PAGE_SIZE_OPTIONS,
  initialPageSize: 10,
});
