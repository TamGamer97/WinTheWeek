import React from 'react';
import {loadFont} from '@remotion/fonts';
import {AbsoluteFill, Audio, Easing, Img, interpolate, Sequence, staticFile, useCurrentFrame} from 'remotion';
import {Video} from '@remotion/media';
import {DISSOLVE, FPS, shots, Shot, soundtrack, durationInFrames} from './story';
import {IPhoneFrame} from './IPhoneFrame';

loadFont({family:'Outfit',url:staticFile('fonts/Outfit_600SemiBold.ttf'),weight:'600'});
loadFont({family:'Manrope',url:staticFile('fonts/Manrope_400Regular.ttf'),weight:'400'});

const ease = Easing.bezier(.2,.75,.25,1);
const ramp=(f:number,from:number,to:number,a:number,b:number)=>interpolate(f,[from,to],[a,b],{extrapolateLeft:'clamp',extrapolateRight:'clamp',easing:ease});
const palette={paper:'#F5F5F4',ink:'#1C1917',muted:'#78716C',blue:'#3860E8',navy:'#0B2541',gold:'#FFC522'};

function Brand({dark=false}:{dark?:boolean}) {
  return <div style={{position:'absolute',left:132,top:78,display:'flex',gap:18,alignItems:'center'}}>
    <Img src={staticFile('brand/icon.png')} style={{width:52,height:52,borderRadius:14}} />
    <span style={{fontFamily:'Outfit',fontSize:30,letterSpacing:-.8,color:dark?'#FFFFFF':palette.ink}}>WinTheWeek</span>
  </div>;
}

function Scene({shot,length,index}:{shot:Shot;length:number;index:number}) {
  const f=useCurrentFrame();
  const dark=!!shot.dark;
  const enter=ramp(f,0,20,0,1);
  const opacity=index===0?1:ramp(f,0,DISSOLVE,0,1);
  if(shot.id==='brand')return <AbsoluteFill style={{opacity,background:`linear-gradient(125deg, #102F51, ${palette.navy})`,color:'#FFFFFF',justifyContent:'center',alignItems:'center'}}>
    <div style={{display:'flex',flexDirection:'column',alignItems:'center',transform:`translateY(${(1-enter)*15}px)`,opacity:enter}}>
      <Img src={staticFile('brand/icon.png')} style={{width:166,height:166,borderRadius:42,marginBottom:35,boxShadow:'0 24px 70px #00000028'}} />
      <div style={{fontFamily:'Outfit',fontSize:112,fontWeight:600,letterSpacing:-5,lineHeight:1.15}}>{shot.title}</div>
      <div style={{fontSize:32,color:'#C3D2E1',marginTop:25}}>{shot.detail}</div>
      <div style={{width:52,height:4,background:palette.gold,borderRadius:4,marginTop:49,marginBottom:28}} />
      <div style={{fontSize:29,letterSpacing:.5,color:'#D9E6FA'}}>{shot.eyebrow}</div>
    </div>
  </AbsoluteFill>;
  const drift=ramp(f,0,length,0,1);
  return <AbsoluteFill style={{opacity,background:dark?'linear-gradient(120deg,#192333,#0D1119)':palette.paper,color:dark?'#FFFFFF':palette.ink}}>
    <Brand dark={dark}/>
    <div style={{position:'absolute',left:134,top:304,width:905,opacity:enter,transform:`translateY(${(1-enter)*18}px)`}}>
      <div style={{fontSize:shot.id==='hero'?25:19,letterSpacing:shot.id==='hero'?.4:3.4,color:dark?'#93B5F4':palette.blue,marginBottom:32}}>{shot.eyebrow}</div>
      <div style={{fontFamily:'Outfit',fontWeight:600,fontSize:shot.id==='hero'?150:shot.id==='move-today'?100:110,letterSpacing:shot.id==='hero'?-7:-4.5,lineHeight:1.04,whiteSpace:'pre-line'}}>{shot.title}</div>
      <div style={{fontSize:28,lineHeight:1.5,color:dark?'#C3D2E1':palette.muted,marginTop:35,maxWidth:765}}>{shot.detail}</div>
    </div>
    <div style={{position:'absolute',left:1187,top:30,transform:`translateY(${(1-enter)*10-drift*2}px) scale(${1+drift*.004})`,transformOrigin:'center'}}>
      <IPhoneFrame dark={dark}>
      {shot.file?<Video src={staticFile(`recordings/${shot.file}`)} trimBefore={Math.round((shot.inSeconds??0)*FPS)} muted onError={()=>'fail'} style={{width:'100%',height:'100%',objectFit:'contain'}} />:null}
      </IPhoneFrame>
    </div>
    <div style={{position:'absolute',left:136,bottom:92,width:46,height:4,borderRadius:4,background:dark?palette.gold:palette.blue}}/>
  </AbsoluteFill>;
}

export function Promo(){
  let cursor=0;
  return <AbsoluteFill style={{fontFamily:'Manrope',fontWeight:400,background:palette.navy}}>
    <Audio src={staticFile(soundtrack.file)} volume={f=>soundtrack.volume*Math.min(ramp(f,0,30,0,1),ramp(f,durationInFrames-60,durationInFrames,1,0))}/>
    {shots.map((shot,index)=>{
      const from=cursor;
      const frames=Math.round(shot.duration*FPS);
      cursor+=frames;
      // Outgoing scene continues for the incoming scene's dissolve.
      return <Sequence key={shot.id} name={`${index+1}. ${shot.id}`} from={from} durationInFrames={frames+(index<shots.length-1?DISSOLVE:0)}>
        <Scene shot={shot} length={frames} index={index}/>
      </Sequence>;
    })}
  </AbsoluteFill>;
}
