/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { Fragment } from 'react';
import { css } from '@emotion/react';
import { get } from 'lodash';
import {
  EuiBadge,
  EuiBadgeGroup,
  EuiButton,
  EuiCallOut,
  EuiHealth,
  EuiIcon,
  EuiLink,
  EuiPage,
  EuiPageBody,
  EuiPanel,
  EuiScreenReaderOnly,
  EuiSpacer,
  EuiText,
  EuiToolTip,
  euiFontSize,
} from '@elastic/eui';

import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';

import { ELASTICSEARCH_SYSTEM_ID } from '../../../../common/constants';
import { SetupModeFeature } from '../../../../common/enums';
import { AlertsStatus } from '../../../alerts/status';
import { extractIp } from '../../../lib/extract_ip'; // TODO this is only used for elasticsearch nodes summary / node detail, so it should be moved to components/elasticsearch/nodes/lib
import { getSafeForExternalLink } from '../../../lib/get_safe_for_external_link';
import { isSetupModeFeatureEnabled } from '../../../lib/setup_mode';
import { SetupModeBadge } from '../../setup_mode/badge';
import { ListingCallOut } from '../../setup_mode/listing_callout';
import { EuiMonitoringSSPTable } from '../../table';
import { ClusterStatus } from '../cluster_status';
import { MetricCell, OfflineCell } from './cells';

const tableCellNameStyle = (theme) => css`
  ${euiFontSize(theme, 'm')}
`;

const tableCellTransportAddressStyle = (theme) => css`
  ${euiFontSize(theme, 's')}
  color: ${theme.euiTheme.colors.darkShade};
`;

const getNodeTooltip = (node) => {
  const { nodeTypeLabel, nodeTypeClass } = node;

  const nodeTypeLabelContent =
    nodeTypeLabel ||
    i18n.translate('xpack.monitoring.elasticsearch.nodes.unknownNodeTypeLabel', {
      defaultMessage: 'Unknown',
    });
  const nodeTypeClassIcon = nodeTypeClass || 'empty';

  if (nodeTypeLabel) {
    return (
      <>
        <EuiToolTip position="bottom" content={nodeTypeLabelContent}>
          <EuiIcon type={nodeTypeClassIcon} />
        </EuiToolTip>{' '}
        &nbsp;
      </>
    );
  }
  return null;
};

const getSortHandler = (type) => (item) => get(item, [type, 'summary', 'lastVal']);
const getColumns = (showCgroupMetricsElasticsearch, setupMode, clusterUuid, alerts) => {
  const cols = [];

  const cpuUsageColumnTitle = i18n.translate(
    'xpack.monitoring.elasticsearch.nodes.cpuUsageColumnTitle',
    {
      defaultMessage: 'CPU Usage',
    }
  );

  cols.push({
    name: i18n.translate('xpack.monitoring.elasticsearch.nodes.nameColumnTitle', {
      defaultMessage: 'Name',
    }),
    field: 'name',
    sortable: true,
    render: (value, node) => {
      let nameLink = (
        <EuiLink
          href={getSafeForExternalLink(`#/elasticsearch/nodes/${node.resolver}`)}
          data-test-subj={`nodeLink-${node.resolver}`}
        >
          {value}
        </EuiLink>
      );

      let setupModeStatus = null;
      if (isSetupModeFeatureEnabled(SetupModeFeature.MetricbeatMigration)) {
        const list = get(setupMode, 'data.byUuid', {});
        const status = list[node.resolver] || {};
        const instance = {
          uuid: node.resolver,
          name: node.name,
        };

        setupModeStatus = (
          <SetupModeBadge
            setupMode={setupMode}
            status={status}
            instance={instance}
            productName={ELASTICSEARCH_SYSTEM_ID}
            clusterUuid={clusterUuid}
          />
        );
        if (status.isNetNewUser) {
          nameLink = value;
        }
      }

      return (
        <div>
          <div css={tableCellNameStyle}>
            <EuiText size="m">
              {getNodeTooltip(node)}
              <span data-test-subj="name">{nameLink}</span>
            </EuiText>
          </div>
          <div css={tableCellTransportAddressStyle}>{extractIp(node.transport_address)}</div>
          {setupModeStatus}
        </div>
      );
    },
  });

  cols.push({
    name: i18n.translate('xpack.monitoring.elasticsearch.nodes.alertsColumnTitle', {
      defaultMessage: 'Alerts',
    }),
    field: 'alerts',
    sortable: true,
    render: (_field, node) => {
      return (
        <AlertsStatus
          showBadge={true}
          alerts={alerts}
          stateFilter={(state) => (state.nodeId || state.nodeUuid) === node.resolver}
        />
      );
    },
  });

  cols.push({
    name: i18n.translate('xpack.monitoring.elasticsearch.nodes.statusColumnTitle', {
      defaultMessage: 'Status',
    }),
    dataType: 'boolean',
    field: 'isOnline',
    sortable: true,
    render: (value) => {
      const status = value
        ? i18n.translate('xpack.monitoring.elasticsearch.nodes.statusColumn.onlineLabel', {
            defaultMessage: 'Online',
          })
        : i18n.translate('xpack.monitoring.elasticsearch.nodes.statusColumn.offlineLabel', {
            defaultMessage: 'Offline',
          });
      return (
        <EuiToolTip content={status} position="bottom" trigger="hover">
          <EuiHealth
            color={value ? 'success' : 'subdued'}
            data-test-subj="statusIcon"
            alt={i18n.translate('xpack.monitoring.elasticsearch.nodes.healthAltIcon', {
              defaultMessage: 'Status: {status}',
              values: {
                status,
              },
            })}
          >
            {status}
          </EuiHealth>
        </EuiToolTip>
      );
    },
  });

  cols.push({
    name: i18n.translate('xpack.monitoring.elasticsearch.nodes.rolesColumnTitle', {
      defaultMessage: 'Roles',
    }),
    field: 'roles',
    render: (roles) => {
      if (!roles) {
        return i18n.translate('xpack.monitoring.formatNumbers.notAvailableLabel', {
          defaultMessage: 'N/A',
        });
      }

      if (roles.length === 0) {
        return (
          <EuiBadge>
            {i18n.translate('xpack.monitoring.elasticsearch.nodes.coordinatingNodeLabel', {
              defaultMessage: 'coordinating only',
            })}
          </EuiBadge>
        );
      }

      const head = roles.slice(0, 5);
      const tail = roles.slice(5);
      const hasMoreRoles = tail.length > 0;

      return (
        <EuiBadgeGroup gutterSize="xs">
          {head.map((role) => (
            <EuiBadge color={role === 'master' ? 'hollow' : 'default'}>{role}</EuiBadge>
          ))}
          {hasMoreRoles && (
            <EuiToolTip
              anchorProps={{
                style: { lineHeight: '1' },
              }}
              position="bottom"
              content={tail.join(', ')}
            >
              <EuiBadge>+{tail.length}</EuiBadge>
            </EuiToolTip>
          )}
        </EuiBadgeGroup>
      );
    },
  });

  cols.push({
    name: i18n.translate('xpack.monitoring.elasticsearch.nodes.shardsColumnTitle', {
      defaultMessage: 'Shards',
    }),
    dataType: 'number',
    field: 'shardCount',
    sortable: true,
    render: (value, node) => {
      return node.isOnline ? <span data-test-subj="shards">{value}</span> : <OfflineCell />;
    },
  });

  if (showCgroupMetricsElasticsearch) {
    cols.push({
      name: cpuUsageColumnTitle,
      dataType: 'number',
      field: 'node_cgroup_quota',
      sortable: getSortHandler('node_cgroup_quota'),
      render: (value, node) => (
        <MetricCell
          isOnline={node.isOnline}
          metric={value}
          isPercent={true}
          data-test-subj="cpuQuota"
        />
      ),
    });

    cols.push({
      name: i18n.translate('xpack.monitoring.elasticsearch.nodes.cpuThrottlingColumnTitle', {
        defaultMessage: 'CPU Throttling',
      }),
      dataType: 'number',
      field: 'node_cgroup_throttled',
      sortable: getSortHandler('node_cgroup_throttled'),
      render: (value, node) => (
        <MetricCell
          isOnline={node.isOnline}
          metric={value}
          isPercent={false}
          data-test-subj="cpuThrottled"
        />
      ),
    });
  } else {
    cols.push({
      name: cpuUsageColumnTitle,
      dataType: 'number',
      field: 'node_cpu_utilization',
      sortable: getSortHandler('node_cpu_utilization'),
      render: (value, node) => {
        return (
          <MetricCell
            isOnline={node.isOnline}
            metric={value}
            isPercent={true}
            data-test-subj="cpuUsage"
          />
        );
      },
    });

    cols.push({
      name: i18n.translate('xpack.monitoring.elasticsearch.nodes.loadAverageColumnTitle', {
        defaultMessage: 'Load Average',
      }),
      dataType: 'number',
      field: 'node_load_average',
      sortable: getSortHandler('node_load_average'),
      render: (value, node) => (
        <MetricCell
          isOnline={node.isOnline}
          metric={value}
          isPercent={false}
          data-test-subj="loadAverage"
        />
      ),
    });
  }

  cols.push({
    name: i18n.translate('xpack.monitoring.elasticsearch.nodes.jvmMemoryColumnTitle', {
      defaultMessage: '{javaVirtualMachine} Heap',
      values: {
        javaVirtualMachine: 'JVM',
      },
    }),
    dataType: 'number',
    field: 'node_jvm_mem_percent',
    sortable: getSortHandler('node_jvm_mem_percent'),
    render: (value, node) => (
      <MetricCell
        isOnline={node.isOnline}
        metric={value}
        isPercent={true}
        data-test-subj="jvmMemory"
      />
    ),
  });

  cols.push({
    name: i18n.translate('xpack.monitoring.elasticsearch.nodes.diskFreeSpaceColumnTitle', {
      defaultMessage: 'Disk Free Space',
    }),
    dataType: 'number',
    field: 'node_free_space',
    sortable: getSortHandler('node_free_space'),
    render: (value, node) => (
      <MetricCell
        isOnline={node.isOnline}
        metric={value}
        isPercent={false}
        data-test-subj="diskFreeSpace"
      />
    ),
  });

  return cols;
};

export function ElasticsearchNodes({ clusterStatus, showCgroupMetricsElasticsearch, ...props }) {
  const { sorting, pagination, onTableChange, clusterUuid, setupMode, alerts } = props;

  const columns = getColumns(showCgroupMetricsElasticsearch, setupMode, clusterUuid, alerts);

  // Merge the nodes data with the setup data if enabled
  const nodes = props.nodes || [];
  if (
    setupMode &&
    setupMode.enabled &&
    isSetupModeFeatureEnabled(SetupModeFeature.MetricbeatMigration)
  ) {
    // We want to create a seamless experience for the user by merging in the setup data
    // and the node data from monitoring indices in the likely scenario where some nodes
    // are using MB collection and some are using no collection
    const nodesByUuid = nodes.reduce(
      (byUuid, node) => ({
        ...byUuid,
        [node.id || node.resolver]: node,
      }),
      {}
    );

    nodes.push(
      ...Object.entries(setupMode.data.byUuid).reduce((nodes, [nodeUuid, instance]) => {
        if (!nodesByUuid[nodeUuid] && instance.node) {
          nodes.push(instance.node);
        }
        return nodes;
      }, [])
    );
  }

  let setupModeCallout = null;
  if (isSetupModeFeatureEnabled(SetupModeFeature.MetricbeatMigration)) {
    setupModeCallout = (
      <ListingCallOut
        setupModeData={setupMode.data}
        useNodeIdentifier
        productName={ELASTICSEARCH_SYSTEM_ID}
        customRenderer={() => {
          const customRenderResponse = {
            shouldRender: false,
            componentToRender: null,
          };

          const isNetNewUser = setupMode.data.totalUniqueInstanceCount === 0;
          const hasNoInstances =
            setupMode.data.totalUniqueInternallyCollectedCount === 0 &&
            setupMode.data.totalUniqueFullyMigratedCount === 0 &&
            setupMode.data.totalUniquePartiallyMigratedCount === 0;

          if (isNetNewUser || hasNoInstances) {
            customRenderResponse.shouldRender = true;
            customRenderResponse.componentToRender = (
              <Fragment>
                <EuiCallOut
                  title={i18n.translate(
                    'xpack.monitoring.elasticsearch.nodes.metricbeatMigration.detectedNodeTitle',
                    {
                      defaultMessage: 'Elasticsearch node detected',
                    }
                  )}
                  color={setupMode.data.totalUniqueInstanceCount > 0 ? 'danger' : 'warning'}
                  iconType="flag"
                >
                  <p>
                    {i18n.translate(
                      'xpack.monitoring.elasticsearch.nodes.metricbeatMigration.detectedNodeDescription',
                      {
                        defaultMessage: `The following nodes are not monitored. Click 'Monitor with Metricbeat' below to start monitoring.`,
                      }
                    )}
                  </p>
                </EuiCallOut>
                <EuiSpacer size="m" />
              </Fragment>
            );
          } else if (
            setupMode.data.totalUniquePartiallyMigratedCount ===
            setupMode.data.totalUniqueInstanceCount
          ) {
            const finishMigrationAction =
              get(setupMode.meta, 'liveClusterUuid') === clusterUuid
                ? setupMode.shortcutToFinishMigration
                : setupMode.openFlyout;

            customRenderResponse.shouldRender = true;
            customRenderResponse.componentToRender = (
              <Fragment>
                <EuiCallOut
                  title={i18n.translate(
                    'xpack.monitoring.elasticsearch.nodes.metricbeatMigration.disableInternalCollectionTitle',
                    {
                      defaultMessage: 'Metricbeat is now monitoring your Elasticsearch nodes',
                    }
                  )}
                  color="warning"
                  iconType="flag"
                >
                  <p>
                    {i18n.translate(
                      'xpack.monitoring.elasticsearch.nodes.metricbeatMigration.disableInternalCollectionDescription',
                      {
                        defaultMessage: `Disable self monitoring to finish the migration.`,
                      }
                    )}
                  </p>
                  <EuiButton onClick={finishMigrationAction} size="s" color="warning" fill>
                    {i18n.translate(
                      'xpack.monitoring.elasticsearch.nodes.metricbeatMigration.disableInternalCollectionMigrationButtonLabel',
                      {
                        defaultMessage: 'Disable self monitoring',
                      }
                    )}
                  </EuiButton>
                </EuiCallOut>
                <EuiSpacer size="m" />
              </Fragment>
            );
          }

          return customRenderResponse;
        }}
      />
    );
  }

  function renderClusterStatus() {
    if (!clusterStatus) {
      return null;
    }
    return (
      <Fragment>
        <EuiPanel>
          <ClusterStatus stats={clusterStatus} alerts={alerts} />
        </EuiPanel>
        <EuiSpacer size="m" />
      </Fragment>
    );
  }

  return (
    <EuiPage>
      <EuiPageBody>
        <EuiScreenReaderOnly>
          <h1>
            <FormattedMessage
              id="xpack.monitoring.elasticsearch.nodes.heading"
              defaultMessage="Elasticsearch nodes"
            />
          </h1>
        </EuiScreenReaderOnly>
        {renderClusterStatus()}
        {setupModeCallout}
        <EuiPanel>
          <EuiMonitoringSSPTable
            data-test-subj="elasticsearchNodesTable"
            rows={nodes}
            columns={columns}
            sorting={sorting}
            pagination={pagination}
            setupMode={setupMode}
            productName={ELASTICSEARCH_SYSTEM_ID}
            search={{
              box: {
                incremental: true,
                placeholder: i18n.translate(
                  'xpack.monitoring.elasticsearch.nodes.monitoringTablePlaceholder',
                  {
                    defaultMessage: 'Filter Nodes…',
                  }
                ),
              },
            }}
            onTableChange={onTableChange}
            {...props}
          />
        </EuiPanel>
      </EuiPageBody>
    </EuiPage>
  );
}
