import { BrtCookies, BrtData, BrtFeedback, BrtField, BrtLog, BrtNavigatorInfo, BrtScreenInfo, BrtServiceWorker } from '@bruit/types';
import { BrtFieldType } from '@bruit/types/dist/enums/brt-field-type';
import { BrtScreenshot } from '@bruit/types/dist/interfaces/brt-screenshot';
import { BruitCoreConfig } from '../models/bruit-core-config.class';
import { NavigatorTool } from './../bruit-tools/navigator';
import { ScreenTool } from './../bruit-tools/screen';
import * as Config from './../config/config.json';
import { Api } from './api';

export class Feedback implements BrtFeedback {

  apiKey: string;
  apiUrl: string = Config['BRUIT_IO_API_URL'];

  // FeedbackModel:
  date: string;
  canvas: Blob;
  url: string;
  cookies: BrtCookies;
  navigator: BrtNavigatorInfo;
  display: BrtScreenInfo;
  logs: Array<BrtLog>;
  data: Array<BrtData>;
  serviceWorkers: Array<BrtServiceWorker>;
  version: string;

  constructor(bruitCoreConfig: BruitCoreConfig) {
    this.apiUrl = bruitCoreConfig.apiUrl;
    this.version = Config['version'];
    if (bruitCoreConfig) this.apiKey = bruitCoreConfig.apiKey;
    // console.log('constructor feedback');
  }

  /**
   *
   * @param formFields
   * @param data
   * @param dataFn
   */
  public async send(
    formFields: Array<BrtField>,
    data: Array<BrtData> = [],
    dataFn?: () => Array<BrtData> | Promise<Array<BrtData>>,
    screenshotConfig?: BrtScreenshot,
  ): Promise<any> {
    // console.log('send feedback');

    try {

      // set data/info/screenshot if agreement
      const agreementField = formFields.find(field => field.id === 'agreement');
      const agreement = agreementField ? agreementField.value : false;
      if (agreement) {
        await this.setAgreementData(screenshotConfig);
      }

      // set feedback data
      const dataFromFn: Array<BrtData> = await this.getDataFromFn(dataFn);
      const formData = formFields.map(field => this.fieldToData(field));
      this.data = [...formData, ...data, ...dataFromFn];

      return Api.postFeedback({
        date: new Date().toString(),
        apiKey: this.apiKey,
        version: this.version,
        canvas: agreement ? this.canvas : undefined,
        url: this.url,
        cookies: agreement ? this.cookies : undefined,
        navigator: agreement ? this.navigator : undefined,
        display: agreement ? this.display : undefined,
        logs: agreement ? this.logs : undefined,
        serviceWorkers: agreement ? this.serviceWorkers : undefined,
        data: this.data
      }, this.apiUrl);
    } catch (e) {
      throw new Error(e);
    }
  }

  private async setAgreementData(screenshotConfig?: BrtScreenshot): Promise<void> {
    const [screenShot, navigator, serviceWorkers] = await Promise.all([
      ScreenTool.getScreenshot(screenshotConfig),
      NavigatorTool.getInfo(),
      NavigatorTool.getServiceWorkersList()
    ]);
    this.navigator = navigator;
    this.serviceWorkers = serviceWorkers;
    this.canvas = screenShot;

    this.url = NavigatorTool.getUrl();
    this.cookies = NavigatorTool.getCookies();
    this.display = ScreenTool.getInfo();
    if ((<any>console).overloadable && (<any>console).overloaded && (<any>console).overloaded.logArray) {
      this.logs = (<any>console).logArray();
    } else {
      this.logs = [];
    }
  }

  /**
   *
   * @param dataFn a function that return an Array<Field> or an Promise<Array<Field>>
   *
   * @return a promise of Array<Field>
   */
  private async getDataFromFn(dataFn?: () => Array<BrtData> | Promise<Array<BrtData>>): Promise<Array<BrtData>> {
    // dataFn (function or promise)
    if (dataFn) {
      if (typeof dataFn === 'function') {
        return dataFn();
      } else if (typeof dataFn === 'object' && (<Promise<Array<BrtData>>>dataFn).then) {
        return <Promise<Array<BrtData>>>dataFn;
      }
    } else {
      return [];
    }
  }

  /**
   *
   * @param field : BrtField from form
   *
   * @return a BrtData
   */
  private fieldToData(field: BrtField): BrtData {
    const data = <BrtData>{
      type: field.type,
      value: field.value,
      label: field.label,
      id: field.id
    };
    if (data.type === BrtFieldType.RATING) {
      data.max = field.max || 5;
    }
    return data;
  }
}
