// Re-encode retained lossless screencast frames without re-running app actions.
const fs=require('node:fs');
const path=require('node:path');
const {execFileSync}=require('node:child_process');
const root=path.resolve(__dirname,'..');
const provenance=JSON.parse(fs.readFileSync(path.join(root,'public/recordings/v2/provenance.json')));
for(const {name} of provenance.recordings){
  execFileSync(require('ffmpeg-static'),['-hide_banner','-loglevel','error','-y','-safe','0','-f','concat','-i',path.join(root,'capture',name,'frames.ffconcat'),'-vf','fps=30,scale=824:1648:flags=lanczos','-c:v','libx264','-preset','fast','-crf','14','-g','15','-keyint_min','15','-sc_threshold','0','-bf','0','-pix_fmt','yuv420p','-an','-movflags','+faststart',path.join(root,'public/recordings/v2',`${name}.mp4`)],{stdio:'inherit'});
  console.log(`Encoded ${name} with half-second keyframes`);
}
