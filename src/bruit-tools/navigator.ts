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

}
