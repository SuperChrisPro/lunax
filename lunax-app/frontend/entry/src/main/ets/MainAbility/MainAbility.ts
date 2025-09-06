:
import UIAbility from '@ohos.app.ability.UIAbility';
import window from '@ohos.window';

export default class MainAbility extends UIAbility {
  onCreate(want, launchParam) {
    console.info('LunaX App onCreate');
  }

  onDestroy() {
    console.info('LunaX App onDestroy');
  }

  onWindowStageCreate(windowStage: window.WindowStage) {
    console.info('LunaX App onWindowStageCreate');
    windowStage.loadContent('pages/Index', (err, data) => {
      if (err.code) {
        console.error('Failed to load the content. Cause:' + JSON.stringify(err));
        return;
      }
      console.info('Succeeded in loading the content. Data: ' + JSON.stringify(data));
    });
  }

  onWindowStageDestroy() {
    console.info('LunaX App onWindowStageDestroy');
  }

  onForeground() {
    console.info('LunaX App onForeground');
  }

  onBackground() {
    console.info('LunaX App onBackground');
  }
}