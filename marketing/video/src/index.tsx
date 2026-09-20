import React from 'react';
import {Composition,registerRoot} from 'remotion';
import {Promo} from './Promo';
import {durationInFrames,FPS} from './story';

const Root=()=> <Composition id="WinTheWeek" component={Promo} durationInFrames={durationInFrames} fps={FPS} width={1920} height={1080}/>;
registerRoot(Root);
