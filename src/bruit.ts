import { BrtCoreConfig, BrtData, BrtField } from '@bruit/types';
import { BrtScreenshot } from '@bruit/types/dist/interfaces/brt-screenshot';
import { Feedback } from './api/feedback';
import { ConsoleTool } from './bruit-tools/console';
import { BruitCoreConfig } from './models/bruit-core-config.class';
export class Bruit {

    private static config: BruitCoreConfig;

    public static init(config: BrtCoreConfig) {
        const errors = BruitCoreConfig.haveError(config);
        if (!errors) {
            const bruitCoreConfig = new BruitCoreConfig(config);
            Bruit.config = bruitCoreConfig;
            ConsoleTool.init(Bruit.config.log);
            if (window) {
                (window as any).Bruit = Bruit;
            }
        } else {
            console.error('BRUIT.IO ERROR :', errors);
            throw new Error('BRUIT.IO ERROR :' + JSON.stringify(errors));
        }
    }

    public static getConfig() {
        return Bruit.config;
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
