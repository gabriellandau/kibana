/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import expect from '@kbn/expect';

import { FtrProviderContext } from '../../../ftr_provider_context';

export default function ({ getService, getPageObjects }: FtrProviderContext) {
  const retry = getService('retry');
  const browser = getService('browser');
  const kibanaServer = getService('kibanaServer');
  const dashboardPanelActions = getService('dashboardPanelActions');
  const { dashboard, common } = getPageObjects(['dashboard', 'common']);
  const filterBar = getService('filterBar');

  describe('full screen mode', () => {
    before(async () => {
      await kibanaServer.savedObjects.cleanStandardList();
      await kibanaServer.importExport.load(
        'src/platform/test/functional/fixtures/kbn_archiver/dashboard/current/kibana'
      );
      await kibanaServer.uiSettings.replace({
        defaultIndex: '0bf35f60-3dc9-11e8-8660-4d65aa086b3c',
      });
      await dashboard.navigateToApp();
      await dashboard.preserveCrossAppState();
      await dashboard.loadSavedDashboard('few panels');
    });

    after(async () => {
      await kibanaServer.savedObjects.cleanStandardList();
    });

    it('option not available in edit mode', async () => {
      await dashboard.switchToEditMode();
      const exists = await dashboard.fullScreenModeMenuItemExists();
      expect(exists).to.be(false);
    });

    it('available in view mode', async () => {
      await dashboard.saveDashboard('full screen test', {
        saveAsNew: true,
        exitFromEditMode: true,
      });
      const exists = await dashboard.fullScreenModeMenuItemExists();
      expect(exists).to.be(true);
    });

    it('hides the chrome', async () => {
      const isChromeVisible = await common.isChromeVisible();
      expect(isChromeVisible).to.be(true);

      await dashboard.clickFullScreenMode();

      await retry.try(async () => {
        const isChromeHidden = await common.isChromeHidden();
        expect(isChromeHidden).to.be(true);
      });
    });

    it('displays exit full screen logo button', async () => {
      const exists = await dashboard.exitFullScreenLogoButtonExists();
      expect(exists).to.be(true);
    });

    it('displays exit full screen logo button when panel is expanded', async () => {
      await dashboardPanelActions.clickExpandPanelToggle();

      const exists = await dashboard.exitFullScreenTextButtonExists();
      expect(exists).to.be(true);
    });

    it('exits when the text button is clicked on', async () => {
      await dashboard.exitFullScreenMode();
      await retry.try(async () => {
        const isChromeVisible = await common.isChromeVisible();
        expect(isChromeVisible).to.be(true);
      });
    });

    it('shows filter bar in fullscreen mode', async () => {
      await filterBar.addFilter({ field: 'bytes', operation: 'is', value: '12345678' });
      await dashboard.waitForRenderComplete();
      await dashboard.clickFullScreenMode();
      await retry.try(async () => {
        const isChromeHidden = await common.isChromeHidden();
        expect(isChromeHidden).to.be(true);
      });
      expect(await filterBar.getFilterCount()).to.be(1);
      await dashboard.clickExitFullScreenLogoButton();
      await retry.try(async () => {
        const isChromeVisible = await common.isChromeVisible();
        expect(isChromeVisible).to.be(true);
      });
      await filterBar.removeFilter('bytes');
    });

    it('exits full screen mode when back button pressed', async () => {
      await dashboard.clickFullScreenMode();
      await browser.goBack();
      await retry.try(async () => {
        const isChromeVisible = await common.isChromeVisible();
        expect(isChromeVisible).to.be(true);
      });

      await browser.goForward();
      await retry.try(async () => {
        const isChromeVisible = await common.isChromeVisible();
        expect(isChromeVisible).to.be(true);
      });
    });
  });
}
