import {Config} from '@remotion/cli/config';
Config.setVideoImageFormat('jpeg');
Config.setJpegQuality(95);
Config.setOverwriteOutput(true);
// Uses Chrome when provided; otherwise Remotion installs its own headless shell.
if(process.env.CHROME_PATH) Config.setBrowserExecutable(process.env.CHROME_PATH);
