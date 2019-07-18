import { BrtScreenInfo } from '@bruit/types';
import { BrtScreenshot } from '@bruit/types/dist/interfaces/brt-screenshot';
import html2canvas from 'html2canvas';

export interface Html2canvasConfig {
  background: string;
  height: number;
  width: number;
  logging: boolean;
  imageTimeout: number;
  scale: number;
}


export class ScreenTool {
  static getInfo(): BrtScreenInfo {
    return {
      height: window.screen.height,
      width: window.screen.width,
      pixelRatio: window.devicePixelRatio
    };
  }

  static getScaleFromWidth(width: number): number {
    return width / screen.width;
  }

  static getScaleFromHeight(height: number): number {
    return height / screen.height;
  }

  static getScreenshot(screenshotConfig?: BrtScreenshot): Promise<Blob> {
    // console.log('getScreenshot go');
    return new Promise((resolve, reject) => {
      // console.log('getScreenshot div');

      const div = screenshotConfig && screenshotConfig.elementToRenderSelector ? document.querySelector(screenshotConfig.elementToRenderSelector) as HTMLElement : document.body;
      const options: Html2canvasConfig = {
        background: 'white',
        height: div.scrollHeight,
        width: div.scrollWidth,
        logging: false,
        imageTimeout: 1500,
        scale: null
      };
      let imageType = 'image/png';
      let compression = 0.5;
      const scaleFromWidth = screenshotConfig && screenshotConfig.maxWidth ? ScreenTool.getScaleFromWidth(screenshotConfig.maxWidth) : window.devicePixelRatio;
      const scaleFromHeight = screenshotConfig && screenshotConfig.maxHeight ? ScreenTool.getScaleFromHeight(screenshotConfig.maxHeight) : window.devicePixelRatio;
      options.scale = Math.min(scaleFromWidth, scaleFromHeight);
      if (screenshotConfig && screenshotConfig.imageType) imageType = screenshotConfig.imageType;
      if (screenshotConfig && screenshotConfig.compression) compression = screenshotConfig.compression;
      try {
        // console.log('getScreenshot html2canvas');
        html2canvas(div, options).then((canvas) => {
          // console.log('getScreenshot toBlob');

          canvas.toBlob((result: Blob) => {
            // console.log('getScreenshot end');

            resolve(result);
          }, imageType, compression);
        });

      } catch (error) {
        // console.log('getScreenshot error');

        console.error(error);
        reject(error);
      }
    });
  }
}
