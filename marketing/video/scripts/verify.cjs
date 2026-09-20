const fs=require('node:fs');
const path=require('node:path');
const {execFileSync}=require('node:child_process');
const ffprobe=require('ffprobe-static').path;
const ffmpeg=require('ffmpeg-static');
const root=path.resolve(__dirname,'..');
const {durationInFrames,FPS,DISSOLVE,shots,soundtrack}=require('../src/story.ts');
const file=path.join(root,'out/WinTheWeek-promo-1080p.mp4');
const result=JSON.parse(execFileSync(ffprobe,['-v','error','-show_format','-show_streams','-of','json',file],{encoding:'utf8'}));
const video=result.streams.find(s=>s.codec_type==='video');
const soundtrackPath=path.join(root,'public',soundtrack.file);
const audioSource=JSON.parse(execFileSync(ffprobe,['-v','error','-show_format','-of','json',soundtrackPath],{encoding:'utf8'}));
const sourceClips=shots.filter(shot=>shot.file).map(shot=>{
  const source=path.join(root,'public/recordings',shot.file);
  const probe=JSON.parse(execFileSync(ffprobe,['-v','error','-show_format','-of','json',source],{encoding:'utf8'}));
  const available=Number(probe.format.duration);
  const required=shot.duration+DISSOLVE/FPS+(shot.inSeconds??0);
  return {file:shot.file,available,required,hasHandle:available>=required};
});
const checks={
  h264:video?.codec_name==='h264',
  resolution:video?.width===1920&&video?.height===1080,
  pixelFormat:video?.pix_fmt==='yuv420p',
  colorSpace:video?.color_space==='bt709'&&video?.color_range==='tv',
  frameRate:video?.r_frame_rate==='30/1',
  frames:Number(video?.nb_frames)===durationInFrames,
  duration:Math.abs(Number(result.format.duration)-durationInFrames/FPS)<0.1,
  audioCodec:result.streams.some(s=>s.codec_type==='audio'&&s.codec_name==='aac'&&s.channels===2),
  sourceClipsHaveHandles:sourceClips.every(clip=>clip.hasHandle),
  soundtrackCoversFilm:Number(audioSource.format.duration)>=durationInFrames/FPS,
};
execFileSync(ffmpeg,['-v','error','-xerror','-i',file,'-f','null','-'],{stdio:'pipe'});
const report={file,checks,sourceClips,soundtrack:{...soundtrack,sourceDuration:Number(audioSource.format.duration)},decodedWithoutErrors:true,bytes:fs.statSync(file).size,video};
fs.writeFileSync(path.join(root,'out/verification.json'),JSON.stringify(report,null,2));
console.log(JSON.stringify({checks,decodedWithoutErrors:true,bytes:report.bytes},null,2));
if(Object.values(checks).some(pass=>!pass))process.exitCode=1;
