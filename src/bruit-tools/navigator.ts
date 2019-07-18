import { BrtCookies, BrtNavigatorInfo, BrtNetwork, BrtPermissions, BrtServiceWorker, BrtServiceWorkerState, BrtStorageEstimate } from '@bruit/types';
import { BrtPermissionName } from '@bruit/types/dist/enums/brt-permission-name';
import { BrtPermissionStatus } from '@bruit/types/dist/enums/brt-permission-status';
import Bowser from 'bowser';

export class NavigatorTool {
  static navigatorDoesNotSupportsUtf16(): boolean {
    const browser = Bowser.getParser(window.navigator.userAgent);
    return browser.satisfies({ safari: '>0', ie: '>0' });
  }

  static async getInfo(): Promise<BrtNavigatorInfo> {
    try {
      // console.log('getInfo await');
      const [permissions, storage, privateMode] = await Promise.all([
        NavigatorTool.getPermissions(),
        NavigatorTool.getStorageInformation(),
        NavigatorTool.isIncognito()
      ]);
      const {
        cookieEnabled,
        userAgent,
        platform,
        language
      } = window.navigator;
      // console.log('getInfo call getNetworkInformation');
      const network = this.getNetworkInformation();
      // console.log('getInfo call getPluginsInformation');
      const plugins = this.getPluginsInformation();
      const serviceWorkersSupported = 'serviceWorker' in window.navigator;
      return {
        cookieEnabled,
        serviceWorkersSupported,
        userAgent,
        platform,
        language,
        privateMode,
        permissions,
        network,
        storage,
        plugins
      };
    } catch (error) {
      // console.log('getInfo catch error ', error);
      throw error;
    }
  }

  static getNetworkInformation(): BrtNetwork {
    if ('connection' in window.navigator) {
      const { downlink, effectiveType, type } = <any>(
        window.navigator['connection']
      );
      return { downlink, effectiveType, type };
    } else {
      return null;
    }
  }

  static getPluginsInformation(): Array<string> {
    if ('plugins' in window.navigator) {
      const plugins = [];
      for (let i = 0; i < window.navigator.plugins.length; i++) {
        const plugin = window.navigator.plugins.item(i);
        if (plugin) plugins.push(plugin.name);
      }
      return plugins;
    } else {
      return null;
    }
  }

  static async getStorageInformation(): Promise<BrtStorageEstimate> {
    if ('storage' in window.navigator) {
      try {
        const { quota, usage } = await window.navigator.storage.estimate();
        return {
          quota: quota || null,
          usage: usage || null
        };
      } catch (error) {
        throw error;
      }
    } else {
      return { quota: null, usage: null };
    }
  }

  static getCookies(): BrtCookies {
    return document.cookie
      .split('; ')
      .map(c => c.split('='))
      .filter(cookie => cookie.length === 2 && cookie[0][0] !== '_')
      .reduce((acc: BrtCookies, cur) => {
        acc[cur[0]] = cur[1];
        return acc;
      }, {});
  }

  static getUrl(): string {
    return window.location.href;
  }

  static async getPermissions(): Promise<BrtPermissions> {
    // console.log('getInfo getPermissions');

    if (
      navigator &&
      (<any>navigator).permissions &&
      (<any>navigator).permissions.query
    ) {
      const permissionsQueries = Object.keys(BrtPermissionName).map(
        (permissionKey: string) => {
          // console.log('getInfo getPermissions query ', BrtPermissionName[permissionKey]);

          return (<any>navigator).permissions
            .query({ name: BrtPermissionName[permissionKey as keyof typeof BrtPermissionName] })
            .then((pStatus: any) => {
              pStatus.name = BrtPermissionName[permissionKey as keyof typeof BrtPermissionName];
              return pStatus;
            })
            .catch(() => Promise.resolve({ unsupported: true }));
        });

      return Promise.all(permissionsQueries).then(permisionsStatus =>
        permisionsStatus
          .filter(
            pStatus =>
              !pStatus.unsupported &&
              pStatus.state !== BrtPermissionStatus.PROMPT
          )
          .reduce((acc, pStatus) => {
            acc[pStatus.name] = pStatus.state;
            return acc;
          }, {})
      ).catch(error => {
        // console.log('getInfo getPermissions query error', error);
        return Promise.reject(error);
      });
    } else {
      return {};
    }
  }

  static async getServiceWorkersList(): Promise<Array<BrtServiceWorker>> {
    // console.log('getInfo getServiceWorkersList');

    if ('serviceWorker' in window.navigator) {
      try {
        // console.log('getInfo getServiceWorkersList await navigator.serviceWorker.getRegistrations');

        const registrations = await navigator.serviceWorker.getRegistrations();
        return registrations.map(registration => ({
          scope: registration.scope,
          state: NavigatorTool.getServiceWorkerState(registration)
        }));
      } catch (error) {
        // console.log('getInfo getServiceWorkersList error', error);

        throw error;
      }
    } else {
      return null;
    }
  }

  // test if incognito from https://gist.github.com/jherax/a81c8c132d09cc354a0e2cb911841ff1
  static isIncognito(): Promise<boolean> {
    // console.log('getInfo isIncognito');

    return new Promise(resolve => {
      const on = () => resolve(true); // is in private mode
      const off = () => resolve(false); // not private mode
      const testLocalStorage = () => {
        try {
          if (localStorage.length) off();
          else {
            localStorage.x = 1;
            localStorage.removeItem('x');
            off();
          }
        } catch (e) {
          // Safari only enables cookie in private mode
          // if cookie is disabled then all client side storage is disabled
          // if all client side storage is disabled, then there is no point
          // in using private mode
          navigator.cookieEnabled ? on() : off();
        }
      };
      // Chrome & Opera
      if (window['webkitRequestFileSystem' as keyof typeof window]) {
        return void window['webkitRequestFileSystem' as keyof typeof window](0, 0, off, on);
      }
      // Firefox
      if ('MozAppearance' in document.documentElement.style) {
        const db = indexedDB.open('test');
        db.onerror = on;
        db.onsuccess = off;
        return void 0;
      }
      // Safari
      if (/constructor/i.test(window['HTMLElement' as keyof typeof window])) {
        return testLocalStorage();
      }
      // IE10+ & Edge
      if (
        !window.indexedDB &&
        (window['PointerEvent' as keyof typeof window] || window['MSPointerEvent' as keyof typeof window])
      ) {
        return on();
      }
      // others
      return off();
    });
  }

  static getServiceWorkerState(
    registration: ServiceWorkerRegistration
  ): BrtServiceWorkerState {
    const { waiting, installing, active } = registration;
    return {
      waiting: waiting ? waiting.state : null,
      installing: installing ? installing.state : null,
      active: active ? active.state : null
    };
  }

  static isMobileOrTablet(): boolean {
    let check = false;
    (function (a) { if (/(android|bb\d+|meego).+mobile|avantgo|bada\/|blackberry|blazer|compal|elaine|fennec|hiptop|iemobile|ip(hone|od)|iris|kindle|lge |maemo|midp|mmp|mobile.+firefox|netfront|opera m(ob|in)i|palm( os)?|phone|p(ixi|re)\/|plucker|pocket|psp|series(4|6)0|symbian|treo|up\.(browser|link)|vodafone|wap|windows ce|xda|xiino|android|ipad|playbook|silk/i.test(a) || /1207|6310|6590|3gso|4thp|50[1-6]i|770s|802s|a wa|abac|ac(er|oo|s\-)|ai(ko|rn)|al(av|ca|co)|amoi|an(ex|ny|yw)|aptu|ar(ch|go)|as(te|us)|attw|au(di|\-m|r |s )|avan|be(ck|ll|nq)|bi(lb|rd)|bl(ac|az)|br(e|v)w|bumb|bw\-(n|u)|c55\/|capi|ccwa|cdm\-|cell|chtm|cldc|cmd\-|co(mp|nd)|craw|da(it|ll|ng)|dbte|dc\-s|devi|dica|dmob|do(c|p)o|ds(12|\-d)|el(49|ai)|em(l2|ul)|er(ic|k0)|esl8|ez([4-7]0|os|wa|ze)|fetc|fly(\-|_)|g1 u|g560|gene|gf\-5|g\-mo|go(\.w|od)|gr(ad|un)|haie|hcit|hd\-(m|p|t)|hei\-|hi(pt|ta)|hp( i|ip)|hs\-c|ht(c(\-| |_|a|g|p|s|t)|tp)|hu(aw|tc)|i\-(20|go|ma)|i230|iac( |\-|\/)|ibro|idea|ig01|ikom|im1k|inno|ipaq|iris|ja(t|v)a|jbro|jemu|jigs|kddi|keji|kgt( |\/)|klon|kpt |kwc\-|kyo(c|k)|le(no|xi)|lg( g|\/(k|l|u)|50|54|\-[a-w])|libw|lynx|m1\-w|m3ga|m50\/|ma(te|ui|xo)|mc(01|21|ca)|m\-cr|me(rc|ri)|mi(o8|oa|ts)|mmef|mo(01|02|bi|de|do|t(\-| |o|v)|zz)|mt(50|p1|v )|mwbp|mywa|n10[0-2]|n20[2-3]|n30(0|2)|n50(0|2|5)|n7(0(0|1)|10)|ne((c|m)\-|on|tf|wf|wg|wt)|nok(6|i)|nzph|o2im|op(ti|wv)|oran|owg1|p800|pan(a|d|t)|pdxg|pg(13|\-([1-8]|c))|phil|pire|pl(ay|uc)|pn\-2|po(ck|rt|se)|prox|psio|pt\-g|qa\-a|qc(07|12|21|32|60|\-[2-7]|i\-)|qtek|r380|r600|raks|rim9|ro(ve|zo)|s55\/|sa(ge|ma|mm|ms|ny|va)|sc(01|h\-|oo|p\-)|sdk\/|se(c(\-|0|1)|47|mc|nd|ri)|sgh\-|shar|sie(\-|m)|sk\-0|sl(45|id)|sm(al|ar|b3|it|t5)|so(ft|ny)|sp(01|h\-|v\-|v )|sy(01|mb)|t2(18|50)|t6(00|10|18)|ta(gt|lk)|tcl\-|tdg\-|tel(i|m)|tim\-|t\-mo|to(pl|sh)|ts(70|m\-|m3|m5)|tx\-9|up(\.b|g1|si)|utst|v400|v750|veri|vi(rg|te)|vk(40|5[0-3]|\-v)|vm40|voda|vulc|vx(52|53|60|61|70|80|81|83|85|98)|w3c(\-| )|webc|whit|wi(g |nc|nw)|wmlb|wonu|x700|yas\-|your|zeto|zte\-/i.test(a.substr(0, 4))) check = true; })(navigator.userAgent || navigator.vendor || window['opera' as keyof typeof window]);
    return check;
  }
}
