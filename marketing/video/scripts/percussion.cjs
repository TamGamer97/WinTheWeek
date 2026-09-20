// Original, deterministic percussion sound design. No samples, voices,
// melodic instruments, harmony, or third-party music/licensing dependencies.
const fs=require('node:fs');
const path=require('node:path');
const {execFileSync}=require('node:child_process');
const {durationInFrames,FPS}=require('../src/story.ts');
const sampleRate=48000, seconds=durationInFrames/FPS;
const channels=[new Float64Array(Math.ceil(seconds*sampleRate)),new Float64Array(Math.ceil(seconds*sampleRate))];
let seed=2119;
const random=()=>{seed=(1664525*seed+1013904223)>>>0;return seed/4294967296;};
function hit(kind,time,gain,pan=0){
  const length=kind==='frame'?.32:kind==='rim'?.12:.11;
  let phase=0,low=0,low2=0;
  const first=Math.round(time*sampleRate);
  for(let n=0;n<length*sampleRate;n++){
    const t=n/sampleRate,noise=random()*2-1;
    low+=.09*(noise-low);low2+=.34*(noise-low2);
    let v;
    if(kind==='frame'){
      // Brief non-melodic membrane resonance with a soft skin attack.
      phase+=2*Math.PI*(88+55*Math.exp(-t*55))/sampleRate;
      v=(Math.sin(phase)*Math.exp(-t*22)+.2*Math.sin(phase*1.593)*Math.exp(-t*33)+low*Math.exp(-t*95)*1.2)*(1-Math.exp(-t*1400));
    }else if(kind==='rim'){
      v=(low2-low)*2.7*Math.exp(-t*65)*(1-Math.exp(-t*2000));
    }else{
      const envelope=Math.sin(Math.PI*Math.min(1,t/length))**2;
      v=(noise-low2)*envelope*.35;
    }
    const at=first+n;
    if(at>=0&&at<channels[0].length){channels[0][at]+=v*gain*Math.sqrt((1-pan)/2);channels[1][at]+=v*gain*Math.sqrt((1+pan)/2);}
  }
}
const beat=60/96;
for(let b=0;b*beat<seconds-1;b++){
  const t=b*beat;
  const dynamic=t<3?.58:t>30?.48:.8;
  if(b%4===0||b%4===2)hit('frame',t+.005,.58*dynamic,-.08);
  if(b%4===1||b%4===3)hit('rim',t+.009,.35*dynamic,.12);
  if(t<30){
    hit('shaker',t+.015,.23*dynamic,-.3);
    hit('shaker',t+beat/2+.008,.17*dynamic,.3);
    if(b%8===7)hit('rim',t+beat*.73,.14*dynamic,-.22);
  }
}
const output=path.resolve(__dirname,'../public/audio');fs.mkdirSync(output,{recursive:true});
const data=Buffer.alloc(channels[0].length*4);
for(let i=0;i<channels[0].length;i++)for(let ch=0;ch<2;ch++)data.writeInt16LE(Math.round(Math.max(-1,Math.min(1,channels[ch][i]))*32767),(i*2+ch)*2);
const header=Buffer.alloc(44);header.write('RIFF');header.writeUInt32LE(data.length+36,4);header.write('WAVEfmt ',8);header.writeUInt32LE(16,16);header.writeUInt16LE(1,20);header.writeUInt16LE(2,22);header.writeUInt32LE(sampleRate,24);header.writeUInt32LE(sampleRate*4,28);header.writeUInt16LE(4,32);header.writeUInt16LE(16,34);header.write('data',36);header.writeUInt32LE(data.length,40);
const raw=path.join(output,'percussion-source.wav');fs.writeFileSync(raw,Buffer.concat([header,data]));
execFileSync(require('ffmpeg-static'),['-v','error','-y','-i',raw,'-af','loudnorm=I=-19:TP=-2:LRA=7','-ar','48000',path.join(output,'quiet-rhythm.wav')],{stdio:'inherit'});
console.log(`Composed ${seconds}s of original 96 BPM percussion-only rhythm.`);
