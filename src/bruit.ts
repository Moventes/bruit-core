import { Components } from '@bruit/component';
// import { defineCustomElements } from '@bruit/component/dist/cjs/loader.cjs';
import { BrtConfig, BrtCoreConfig, BrtData, BrtField } from '@bruit/types';
import { BrtScreenshot } from '@bruit/types/dist/interfaces/brt-screenshot';
import { Feedback } from './api/feedback';
import { ConsoleTool } from './bruit-tools/console';
import { BruitCoreConfig } from './models/bruit-core-config.class';


export class Bruit {

    public static bruitModalElement: Components.BruitModal;
    public static modalConfig: BrtConfig;

    private static config: BruitCoreConfig;

    public static init(config: BrtCoreConfig, loadBruitModal: boolean = true, modalConfig?: BrtConfig): Promise<void> {
        const errors = BruitCoreConfig.haveError(config);
        if (!errors) {
            const bruitCoreConfig = new BruitCoreConfig(config);
            Bruit.config = bruitCoreConfig;
            ConsoleTool.init(Bruit.config.log);
            if (window) {
                (window as any).Bruit = Bruit;
            }

            if (loadBruitModal) {
                if (modalConfig) {
                    Bruit.modalConfig = modalConfig;
                }
                // Bruit.beforeComponent();
                // return applyPolyfills().then(() => {
                // return defineCustomElements(window).then(() => {
                //     return new Promise((resolve) => {
                //         window.addEventListener('load', function () {
                //             const modal = document.createElement('bruit-modal');
                //             document.body.appendChild(modal);
                //             Bruit.bruitModalElement = modal;
                //             resolve();
                //         });
                //     });
                // });
                // });
            }
            return Promise.resolve();
        } else {
            console.error('BRUIT.IO ERROR :', errors);
            return Promise.reject(errors);
            // throw new Error('BRUIT.IO ERROR :' + JSON.stringify(errors));
        }
    }

    // private static beforeComponent() {
    //     if (
    //         // No Reflect, no classes, no need for shim because native custom elements
    //         // require ES2015 classes or Reflect.
    //         (window as any).Reflect === undefined ||
    //         window.customElements === undefined
    //     ) {
    //         return;
    //     }
    //     var BuiltInHTMLElement = HTMLElement;
    //     (window as any).HTMLElement = /** @this {!Object} */ function HTMLElement() {
    //         return Reflect.construct(
    //             BuiltInHTMLElement, [], /** @type {!Function} */(this.constructor));
    //     };
    //     HTMLElement.prototype = BuiltInHTMLElement.prototype;
    //     HTMLElement.prototype.constructor = HTMLElement;
    //     Object.setPrototypeOf(HTMLElement, BuiltInHTMLElement);
    // }

    public static getConfig() {
        return Bruit.config;
    }

    public static openModal(
        bruitIoConfig: BrtConfig,
        data?: Array<BrtData>,
        dataFn?: () => Array<BrtData> | Promise<Array<BrtData>>
    ): Promise<void> {
        const modal = document.querySelector('bruit-modal');
        if (modal && modal.open) {
            return (modal as Components.BruitModal).open(
                bruitIoConfig,
                data,
                dataFn);
        }
    }



    public static sendFeedback(data: BrtData[] = [], dataFn?: () => BrtData[] | Promise<BrtData[]>, agreement: boolean = false, screenshotConfig?: BrtScreenshot) {

        var feedback = new Feedback(Bruit.config);
        var fields = [];

        if (agreement) {
            fields.push({
                id: 'agreement',
                label: 'agreement',
                value: agreement || false,
                type: 'checkbox'
            });
        }

        return feedback.send(fields, data, dataFn, screenshotConfig);
    }

    public static sendFeedbackFromModal(formFields: BrtField[], data: BrtData[] = [], dataFn?: () => BrtData[] | Promise<BrtData[]>, screenshotConfig?: BrtScreenshot) {
        var feedback = new Feedback(Bruit.config);
        return feedback.send(formFields, data, dataFn, screenshotConfig);
    }

    public static sendError(error: string) {
        // console.log('sendError called with ', error);
        var feedback = new Feedback(Bruit.config);

        return feedback.send([{
            id: 'error',
            label: 'error',
            value: error,
            type: 'textarea'
        }]);
    }
}
