'use client';

import { useEffect, useRef, useState, useCallback } from 'react';

// ─── SHADERS ─────────────────────────────────────────────────────────────────
const vertexShader = `#version 300 es
precision highp float;
in vec2 a_position;
out vec2 vP;
void main(){vP=a_position*.5+.5;gl_Position=vec4(a_position,0.,1.);}`;

const fragmentShader = `#version 300 es
precision highp float;
in vec2 vP;
out vec4 oC;
uniform sampler2D u_tex;
uniform float u_time,u_ratio,u_imgRatio,u_seed,u_scale,u_refract,u_blur,u_liquid;
uniform float u_bright,u_contrast,u_angle,u_fresnel,u_sharp,u_wave,u_noise,u_chroma;
uniform float u_distort,u_contour;
uniform vec3 u_lightColor,u_darkColor,u_tint;
// cursor uniforms
uniform vec2  u_cursor;      // normalised canvas coords 0..1
uniform float u_cursorStr;   // 0..1 strength
vec3 sC,sM;
vec3 pW(vec3 v){vec3 i=floor(v),f=fract(v),s=sign(fract(v*.5)-.5),h=fract(sM*i+i.yzx),c=f*(f-1.);return s*c*((h*16.-4.)*c-1.);}
vec3 aF(vec3 b,vec3 c){return pW(b+c.zxy-pW(b.zxy+c.yzx)+pW(b.yzx+c.xyz));}
vec3 lM(vec3 s,vec3 p){return(p+aF(s,p))*.5;}
vec2 fA(){vec2 c=vP-.5;c.x*=u_ratio>u_imgRatio?u_ratio/u_imgRatio:1.;c.y*=u_ratio>u_imgRatio?1.:u_imgRatio/u_ratio;return vec2(c.x+.5,.5-c.y);}
vec2 rot(vec2 p,float r){float c=cos(r),s=sin(r);return vec2(p.x*c+p.y*s,p.y*c-p.x*s);}
float bM(vec2 c,float t){vec2 l=smoothstep(vec2(0.),vec2(t),c),u=smoothstep(vec2(0.),vec2(t),1.-c);return l.x*l.y*u.x*u.y;}
float mG(float hi,float lo,float t,float sh,float cv){
  sh*=(2.-u_sharp);float ci=smoothstep(.15,.85,cv),r=lo;float e1=.08/u_scale;
  r=mix(r,hi,smoothstep(0.,sh*1.5,t));r=mix(r,lo,smoothstep(e1-sh,e1+sh,t));
  float e2=e1+.05/u_scale*(1.-ci*.35);r=mix(r,hi,smoothstep(e2-sh,e2+sh,t));
  float e3=e2+.025/u_scale*(1.-ci*.45);r=mix(r,lo,smoothstep(e2-sh,e2+sh,t)); // slight adjustment to stabilize transitions
  float e4=e1+.1/u_scale;r=mix(r,hi,smoothstep(e4-sh,e4+sh,t));
  float rm=1.-e4,gT=clamp((t-e4)/rm,0.,1.);
  r=mix(r,mix(hi,lo,smoothstep(0.,1.,gT)),smoothstep(e4-sh*.5,e4+sh*.5,t));return r;}
void main(){
  sC=fract(vec3(.7548,.5698,.4154)*(u_seed+17.31))+.5;sM=fract(sC.zxy-sC.yzx*1.618);
  vec2 sc=vec2(vP.x*u_ratio,1.-vP.y);float angleRad=u_angle*3.14159/180.;
  sc=rot(sc-.5,angleRad)+.5;sc=clamp(sc,0.,1.);float sl=sc.x-sc.y,an=u_time*.001;
  vec2 iC=fA();vec4 texSample=texture(u_tex,iC);float dp=texSample.r;float shapeMask=texSample.a;

  // ── cursor ripple ──────────────────────────────────────────────────────────
  vec2 cDelta = vP - u_cursor;
  cDelta.x *= u_ratio;
  float cDist  = length(cDelta);
  float cWave  = sin(cDist * 28.0 - u_time * 0.012) * exp(-cDist * 6.0);
  float cRipple = cWave * u_cursorStr * 0.5;
  dp = clamp(dp + cRipple * shapeMask, 0.0, 1.0);

  vec3 hi=u_lightColor*u_bright;vec3 lo=u_darkColor*(2.-u_bright);lo.b+=smoothstep(.6,1.4,sc.x+sc.y)*.08;
  vec2 fC=sc-.5;float rd=length(fC+vec2(0.,sl*.15));vec2 ag=rot(fC,(.22-sl*.18)*3.14159);
  float cv=1.-pow(rd*1.65,1.15);cv*=pow(sc.y,.35);
  float vs=shapeMask;vs*=bM(iC,.01);float fr=pow(1.-cv,u_fresnel)*.3;vs=min(vs+fr*vs,1.);
  float mT=an*.0625;vec3 wO=vec3(-1.05,1.35,1.55);
  vec3 wA=aF(vec3(31.,73.,56.),mT+wO)*.22*u_wave;vec3 wB=aF(vec3(24.,64.,42.),mT-wO.yzx)*.22*u_wave;
  vec2 nC=sc*45.*u_noise;nC+=aF(sC.zxy,an*.17*sC.yzx-sc.yxy*.35).xy*18.*u_wave;
  vec3 tC=vec3(.00041,.00053,.00076)*mT+wB*nC.x+wA*nC.y;tC=lM(sC,tC);tC=lM(sC+1.618,tC);
  float tb=sin(tC.x*3.14159)*.5+.5;tb=tb*2.-1.;
  float noiseVal=pW(vec3(sc*8.+an,an*.5)).x;float edgeFactor=smoothstep(0.,.5,dp)*smoothstep(1.,.5,dp);
  float lD=dp+(1.-dp)*u_liquid*tb;lD+=noiseVal*u_distort*.15*edgeFactor;
  float rB=clamp(1.-cv,0.,1.);float fl=ag.x+sl;fl+=noiseVal*sl*u_distort*edgeFactor;
  fl*=mix(1.,1.-dp*.5,u_contour);fl-=dp*u_contour*.8;
  float eI=smoothstep(0.,1.,lD)*smoothstep(1.,0.,lD);fl-=tb*sl*1.8*eI;
  float cA=cv*clamp(pow(sc.y,.12),.25,1.);fl*=.12+(1.05-lD)*cA;fl*=smoothstep(1.,.65,lD);
  float vA1=smoothstep(.08,.18,sc.y)*smoothstep(.38,.18,sc.y);float vA2=smoothstep(.08,.18,1.-sc.y)*smoothstep(.38,.18,1.-sc.y);
  fl+=vA1*.16+vA2*.025;fl*=.45+pow(sc.y,2.)*.55;fl*=u_scale;fl-=an;
  float rO=rB+cv*tb*.025;float vM1=smoothstep(-.12,.18,sc.y)*smoothstep(.48,.08,sc.y);
  float cM1=smoothstep(.35,.55,cv)*smoothstep(.95,.35,cv);rO+=vM1*cM1*4.5;rO-=sl;
  float bO=rB*1.25;float vM2=smoothstep(-.02,.35,sc.y)*smoothstep(.75,.08,sc.y);
  float cM2=smoothstep(.35,.55,cv)*smoothstep(.75,.35,cv);bO+=vM2*cM2*.9;bO-=lD*.18;
  rO*=u_refract*u_chroma;bO*=u_refract*u_chroma;float sf=u_blur;
  float rP=fract(fl+rO);float rC=mG(hi.r,lo.r,rP,sf+.018+u_refract*cv*.025,cv);
  float gP=fract(fl);float gC=mG(hi.g,lo.g,gP,sf+.008/max(.01,1.-sl),cv);
  float bP=fract(fl-bO);float bC=mG(hi.b,lo.b,bP,sf+.008,cv);
  vec3 col=vec3(rC,gC,bC);col=(col-.5)*u_contrast+.5;col=clamp(col,0.,1.);
  col=mix(col,1.-min(vec3(1.),(1.-col)/max(u_tint,vec3(.001))),length(u_tint-1.)*.5);
  col=clamp(col,0.,1.);

  oC=vec4(col*vs,vs);}`;

// ─── HELPERS ─────────────────────────────────────────────────────────────────
function hexToRgb(hex: string): [number, number, number] {
  const r = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return r ? [parseInt(r[1],16)/255, parseInt(r[2],16)/255, parseInt(r[3],16)/255] : [1,1,1];
}

/**
 * Renders the name onto an offscreen canvas, then computes:
 *   R,G,B = depth (distance from edge normalized continuously 0→1)
 *   A     = native anti-aliased alpha of the drawn text for flawless edges
 */
function buildNameImageData(name: string, targetWidth: number): ImageData {
  if (!name || !name.trim()) {
    return new ImageData(1, 1);
  }

  const dpr    = Math.min(window.devicePixelRatio || 1, 2);
  const physW  = Math.round(targetWidth * dpr);
  const PAD_V  = Math.round(32 * dpr);

  const probe = document.createElement('canvas');
  const pCtx  = probe.getContext('2d')!;

  let fontSize = Math.round(physW * 0.12);
  const makeFont = (sz: number) => `900 ${sz}px "Fraunces", Georgia, serif`;

  pCtx.font = makeFont(fontSize);
  let textW = pCtx.measureText(name).width;
  while (textW > physW * 0.98 && fontSize > 20) {
    fontSize -= 2;
    pCtx.font = makeFont(fontSize);
    textW = pCtx.measureText(name).width;
  }
  while (textW < physW * 0.80 && fontSize < 800) {
    fontSize += 2;
    pCtx.font = makeFont(fontSize);
    textW = pCtx.measureText(name).width;
  }

  const FONT    = makeFont(fontSize);
  const lineH   = Math.round(fontSize * 1.1);
  const canvasW = physW;
  const canvasH = lineH + PAD_V * 2;

  const c   = document.createElement('canvas');
  c.width   = canvasW;
  c.height  = canvasH;
  const ctx = c.getContext('2d')!;

  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, c.width, c.height);
  ctx.fillStyle    = '#000000';
  ctx.font         = FONT;
  ctx.textAlign    = 'center';
  ctx.textBaseline = 'top';
  ctx.fillText(name, canvasW / 2, PAD_V);

  const width  = c.width;
  const height = c.height;
  const imgData = ctx.getImageData(0, 0, width, height);
  const px      = imgData.data;
  const size    = width * height;

  // ── 3. Build binary mask (black pixels = inside shape) ────────────────────
  const inside = new Uint8Array(size);
  for (let i = 0; i < size; i++) {
    const b = i * 4;
    inside[i] = px[b] < 128 ? 1 : 0;
  }

  // ── 4. Continuous Distance Field (SDF) ─────────────────────────────────────
  const INF = 1e9;
  const dist = new Float32Array(size).fill(INF);

  // Seed boundary pixels uniformly to maintain clean depth derivatives
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = y * width + x;
      if (!inside[i]) continue;
      if ((x > 0          && !inside[i - 1])         ||
          (x < width - 1  && !inside[i + 1])         ||
          (y > 0          && !inside[i - width])      ||
          (y < height - 1 && !inside[i + width]))  {
        dist[i] = 0;
      }
    }
  }

  // Forward pass
  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      const i = y * width + x;
      if (!inside[i]) continue;
      const n = Math.min(
        dist[i - width] + 1, dist[i - width - 1] + 1.414,
        dist[i - width + 1] + 1.414, dist[i - 1] + 1
      );
      if (n < dist[i]) dist[i] = n;
    }
  }
  // Backward pass
  for (let y = height - 2; y >= 1; y--) {
    for (let x = width - 2; x >= 1; x--) {
      const i = y * width + x;
      if (!inside[i]) continue;
      const n = Math.min(
        dist[i + width] + 1, dist[i + width + 1] + 1.414,
        dist[i + width - 1] + 1.414, dist[i + 1] + 1
      );
      if (n < dist[i]) dist[i] = n;
    }
  }

  // Compute max distance
  let maxDist = 0;
  for (let i = 0; i < size; i++) {
    if (inside[i] && dist[i] !== INF && dist[i] > maxDist) maxDist = dist[i];
  }
  if (!maxDist) maxDist = 1;

  // ── 5. Write output texture with native continuous alpha ───────────────────
  const out = ctx.createImageData(width, height);

  for (let i = 0; i < size; i++) {
    const b = i * 4;

    // Use the 2D canvas context's native anti-aliasing profile for the edge transparency
    const originalAlpha = 1.0 - (px[b] / 255.0);

    // Scale the depth by the native transparency to make sure it tapers beautifully
    const rawD = inside[i] && dist[i] !== INF ? dist[i] : 0;
    const d = (Math.min(rawD, maxDist) / maxDist) * originalAlpha;

    // RGB = inverted depth
    const gray = Math.round(255 * (1 - d * d));

    out.data[b]   = gray;
    out.data[b+1] = gray;
    out.data[b+2] = gray;
    out.data[b+3] = Math.round(originalAlpha * 255);
  }

  return out;
}

// ─── PROPS ───────────────────────────────────────────────────────────────────
interface MetallicNameProps {
  name:              string;
  height?:           string;
  seed?:             number;
  scale?:            number;
  speed?:            number;
  liquid?:           number;
  brightness?:       number;
  contrast?:         number;
  refraction?:       number;
  blur?:             number;
  lightColor?:       string;
  darkColor?:        string;
  tintColor?:        string;
  fresnel?:          number;
  waveAmplitude?:    number;
  chromaticSpread?:  number;
  distortion?:       number;
  contour?:          number;
  patternSharpness?: number;
  noiseScale?:       number;
  angle?:            number;
}

// ─── COMPONENT ───────────────────────────────────────────────────────────────
export default function MetallicName({
  name,
  height           = '160px',
  seed             = 7,
  scale            = 3.5,
  speed            = 0.25,
  liquid           = 0.85,
  brightness       = 1.8,
  contrast         = 0.7,
  refraction       = 0.018,
  blur             = 0.012,
  lightColor       = '#ba5b38',
  darkColor        = '#1a0a02',
  tintColor        = '#e8b943',
  fresnel          = 1.2,
  waveAmplitude    = 0.9,
  chromaticSpread  = 2.5,
  distortion       = 0.8,
  contour          = 0.25,
  patternSharpness = 1.1,
  noiseScale       = 0.45,
  angle            = 0,
}: MetallicNameProps) {
  const wrapRef   = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const glRef     = useRef<WebGL2RenderingContext | null>(null);
  const uRef      = useRef<Record<string, WebGLUniformLocation | null>>({});
  const texRef    = useRef<WebGLTexture | null>(null);
  const animRef   = useRef(0);
  const lastRef   = useRef(0);
  const rafRef    = useRef<number | null>(null);
  const speedRef  = useRef(speed);

  const cursorRef    = useRef<[number, number]>([0.5, 0.5]);
  const cursorStrRef = useRef(0);

  const texDimsRef = useRef({ w: 1, h: 1 });

  const [glReady,  setGlReady]  = useState(false);
  const [texReady, setTexReady] = useState(false);

  useEffect(() => { speedRef.current = speed; }, [speed]);

  const initGL = useCallback((): boolean => {
    const canvas = canvasRef.current;
    if (!canvas) return false;
    const gl = canvas.getContext('webgl2', { antialias: true, alpha: true, premultipliedAlpha: false });
    if (!gl) return false;

    const compile = (src: string, type: number) => {
      const s = gl.createShader(type)!;
      gl.shaderSource(s, src); gl.compileShader(s);
      if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) {
        console.error('Shader:', gl.getShaderInfoLog(s)); return null;
      }
      return s;
    };
    const vs = compile(vertexShader, gl.VERTEX_SHADER);
    const fs = compile(fragmentShader, gl.FRAGMENT_SHADER);
    if (!vs || !fs) return false;

    const prog = gl.createProgram()!;
    gl.attachShader(prog, vs); gl.attachShader(prog, fs); gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
      console.error('Link:', gl.getProgramInfoLog(prog)); return false;
    }

    const uniforms: Record<string, WebGLUniformLocation | null> = {};
    const n = gl.getProgramParameter(prog, gl.ACTIVE_UNIFORMS);
    for (let i = 0; i < n; i++) {
      const info = gl.getActiveUniform(prog, i);
      if (info) uniforms[info.name] = gl.getUniformLocation(prog, info.name);
    }

    gl.useProgram(prog);
    const buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1,-1,1,-1,-1,1,1,1]), gl.STATIC_DRAW);
    const pos = gl.getAttribLocation(prog, 'a_position');
    gl.enableVertexAttribArray(pos);
    gl.vertexAttribPointer(pos, 2, gl.FLOAT, false, 0, 0);

    gl.enable(gl.BLEND);
    gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);

    glRef.current = gl;
    uRef.current  = uniforms;
    return true;
  }, []);

  const uploadTexture = useCallback((imgData: ImageData) => {
    const gl = glRef.current; const u = uRef.current;
    if (!gl) return;
    if (texRef.current) gl.deleteTexture(texRef.current);

    const tex = gl.createTexture();
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, tex);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA,
      imgData.width, imgData.height, 0, gl.RGBA, gl.UNSIGNED_BYTE, imgData.data);
    gl.uniform1i(u.u_tex, 0);
    gl.uniform1f(u.u_imgRatio, imgData.width / imgData.height);
    gl.uniform1f(u.u_ratio, 1);
    texRef.current = tex;
    texDimsRef.current = { w: imgData.width, h: imgData.height };
  }, []);

  const resizeCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    const wrap   = wrapRef.current;
    const gl     = glRef.current;
    if (!canvas || !wrap || !gl) return;

    const dpr  = window.devicePixelRatio || 1;
    const cssW = wrap.offsetWidth;
    const { w, h } = texDimsRef.current;
    const cssH = Math.round(cssW * (h / w));

    wrap.style.height = cssH + 'px';
    canvas.width  = Math.round(cssW * dpr);
    canvas.height = Math.round(cssH * dpr);
    gl.viewport(0, 0, canvas.width, canvas.height);
    gl.uniform1f(uRef.current.u_ratio, canvas.width / canvas.height);
  }, []);

  useEffect(() => {
    if (!initGL()) return;
    setGlReady(true);
    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current); };
  }, [initGL]);

  useEffect(() => {
    if (!glReady) return;
    setTexReady(false);
    let raf1: number, raf2: number;
    raf1 = requestAnimationFrame(() => {
      raf2 = requestAnimationFrame(() => {
        const wrap = wrapRef.current;
        const targetW = wrap ? Math.max(wrap.offsetWidth, 320) : window.innerWidth;
        try {
          const imgData = buildNameImageData(name, targetW);
          uploadTexture(imgData);
          resizeCanvas();
          setTexReady(true);
        } catch (e) {
          console.error('MetallicName texture build failed:', e);
        }
      });
    });
    return () => { cancelAnimationFrame(raf1); cancelAnimationFrame(raf2); };
  }, [glReady, name, uploadTexture, resizeCanvas]);

  useEffect(() => {
    if (!texReady) return;
    const onResize = () => resizeCanvas();
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, [texReady, resizeCanvas]);

  useEffect(() => {
    if (!texReady) return;
    const canvas = canvasRef.current;
    if (!canvas) return;

    const toUV = (clientX: number, clientY: number): [number, number] => {
      const rect = canvas.getBoundingClientRect();
      return [
        (clientX - rect.left)  / rect.width,
        (clientY - rect.top)   / rect.height,
      ];
    };

    let targetStr = 0;
    let easeRaf   = 0;
    const ease = () => {
      cursorStrRef.current += (targetStr - cursorStrRef.current) * 0.08;
      easeRaf = requestAnimationFrame(ease);
    };
    easeRaf = requestAnimationFrame(ease);

    const onMove = (e: MouseEvent) => {
      cursorRef.current = toUV(e.clientX, e.clientY);
    };
    const onEnter = () => { targetStr = 1; };
    const onLeave = () => { targetStr = 0; };

    const onTouch = (e: TouchEvent) => {
      if (e.touches.length > 0) {
        cursorRef.current = toUV(e.touches[0].clientX, e.touches[0].clientY);
        targetStr = 1;
      }
    };
    const onTouchEnd = () => { targetStr = 0; };

    canvas.addEventListener('mousemove',  onMove);
    canvas.addEventListener('mouseenter', onEnter);
    canvas.addEventListener('mouseleave', onLeave);
    canvas.addEventListener('touchmove',  onTouch,    { passive: true });
    canvas.addEventListener('touchstart', onTouch,    { passive: true });
    canvas.addEventListener('touchend',   onTouchEnd, { passive: true });

    return () => {
      cancelAnimationFrame(easeRaf);
      canvas.removeEventListener('mousemove',  onMove);
      canvas.removeEventListener('mouseenter', onEnter);
      canvas.removeEventListener('mouseleave', onLeave);
      canvas.removeEventListener('touchmove',  onTouch);
      canvas.removeEventListener('touchstart', onTouch);
      canvas.removeEventListener('touchend',   onTouchEnd);
    };
  }, [texReady]);

  useEffect(() => {
    const gl = glRef.current; const u = uRef.current;
    if (!gl || !glReady) return;
    const light = hexToRgb(lightColor);
    const dark  = hexToRgb(darkColor);
    const tint  = hexToRgb(tintColor);
    gl.uniform1f(u.u_seed,    seed);
    gl.uniform1f(u.u_scale,   scale);
    gl.uniform1f(u.u_refract, refraction);
    gl.uniform1f(u.u_blur,    blur);
    gl.uniform1f(u.u_liquid,  liquid);
    gl.uniform1f(u.u_bright,  brightness);
    gl.uniform1f(u.u_contrast,contrast);
    gl.uniform1f(u.u_angle,   angle);
    gl.uniform1f(u.u_fresnel, fresnel);
    gl.uniform1f(u.u_sharp,   patternSharpness);
    gl.uniform1f(u.u_wave,    waveAmplitude);
    gl.uniform1f(u.u_noise,   noiseScale);
    gl.uniform1f(u.u_chroma,  chromaticSpread);
    gl.uniform1f(u.u_distort, distortion);
    gl.uniform1f(u.u_contour, contour);
    gl.uniform3f(u.u_lightColor, light[0], light[1], light[2]);
    gl.uniform3f(u.u_darkColor,  dark[0],  dark[1],  dark[2]);
    gl.uniform3f(u.u_tint,       tint[0],  tint[1],  tint[2]);
  }, [glReady, seed, scale, refraction, blur, liquid, brightness, contrast,
      angle, fresnel, lightColor, darkColor, tintColor, patternSharpness,
      waveAmplitude, noiseScale, chromaticSpread, distortion, contour]);

  useEffect(() => {
    if (!glReady || !texReady) return;
    const gl = glRef.current!; const u = uRef.current;
    const render = (time: number) => {
      animRef.current += (time - lastRef.current) * speedRef.current;
      lastRef.current  = time;
      gl.uniform1f(u.u_time, animRef.current);
      gl.uniform2f(u.u_cursor,    cursorRef.current[0], cursorRef.current[1]);
      gl.uniform1f(u.u_cursorStr, cursorStrRef.current);
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
      rafRef.current = requestAnimationFrame(render);
    };
    lastRef.current = performance.now();
    rafRef.current  = requestAnimationFrame(render);
    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current); };
  }, [glReady, texReady]);

  return (
    <div
      ref={wrapRef}
      style={{
        width: '100%',
        height: height,
        position: 'relative',
        marginBottom: '1.2rem',
        cursor: 'crosshair',
      }}
    >
      <canvas
        ref={canvasRef}
        style={{
          position: 'absolute',
          inset: 0,
          width: '100%',
          height: '100%',
          display: 'block',
        }}
      />
    </div>
  );
}