export class UrlTool {
  static init() {
    if ('onhashchange' in window) {
      window.addEventListener('hashchange', () => {
        this.logUrl(window.location.href);
      });
      this.logUrl(window.location.href);
    }
  }

  static logUrl(...args: any[]) {
    if ((<any>console).url) {
      (<any>console).url(...args);
    } else {
      console.log(...args);
    }
  }
}
