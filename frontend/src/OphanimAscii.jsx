import { useEffect, useLayoutEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import gsap from 'gsap';
import { animate, stagger } from 'animejs';

const ASCII_RAMP = ' .·:-=+*#%@';

const OPHANIM_LINES = [
  '                                       :-=                  :·.                                       ',
  '                                      -+++:                =#*+:                                      ',
  '                                     :=*%**=              *%@@*-.                                     ',
  '                                    .-*#@@@#=            =*%%#*+-.                                    ',
  '                                   :=*%@@@@#=.          ·+*#%@@@#*-                                   ',
  '                                   -+*#%@@%%*+=        -*#@@@@@%*-.                                   ',
  '                                  :+++*#%@@@@#-        =@@@@%%%##*-·                                  ',
  '                                  ::++#%@@@@@%+:      +%@@@%######==                                  ',
  '                                  -: : . ::-*%#     =%%*-::::·=·-*                                    ',
  '                                  =: .:··:#@%-#     =+*=#*=·-:.··=·                                   ',
  '                                  =...:-.+#**+#     -*=-@@*+-··-.--                                   ',
  '                                 .+···:=#@--%%@     +@**#*@*:=:··=-                                   ',
  ' ·-.                              +·:-·:@@%*@@@·    @@@%#=##+=::·--                               -+: ',
  '.:=**:                           .*:.:+#@#@@@#@#   ·@@@@*=%%-::·.--                             ·**=:.',
  ' :+%@@@*·.                       ·%:-=+%#:%@+=@@.  @@@%@@#%@::··=*+                         -=#%*++=: ',
  '  ·=**##%@@+:                    =:·:=+%@-+@+@@·= =·+@+*@**@++==-··-                     :+%@@%#*++-  ',
  '   :+#%@@@@@@#*·               .==···:+@#+@=:@: ·+=  %@=@*-=@#·.··:*                  ·*#@@#%@@%#+-   ',
  '    -*%%%%#@@@@%#-             *:.·.-=@*·+#-%*  :.·. =@@*@+--@=----:                -#%@@@@@@@@#=·    ',
  '     ·-=+#%+--·@@@#=           +=-:::*@=+@·*+ :-.  ··. *#*#.:+#*+=:·+.            =#@@-#*@*@#++-.     ',
  '      -+*#%+%@@@+.@%=          -*::=*@+·##*@ =*      =* @%@=--%%::-·+.           =%@=@@-=@%+=--=      ',
  '       -=+++%@@+**+-+-         ++::+@@=+@#@*.=        .:·@%@*++%=--.--          :+%@@*:::%@+=::       ',
  '        .:-==*@%+=+*@@@@@+... :@··::@*+%@+* +          ··.%@+·:#*.·:-+    ·..-@@%@@*=+-:+@**=.        ',
  '         :=---*@#--=-#@@@@. -=%+·:=-**:+@ : #           -.+.%=*@*·--+-  -:. +@@#%@#+==:=@*--.         ',
  '          :=-+++@#+::+@@@@=.  @*·.·=+@-·@ + -·         .- + #--@===::* =   %@@%#@*=··=%%-:=.          ',
  '           :.-==-*@#%++#@@@* ·=*=··:=#*:+. - -         =.-· *=##++=--#.=  +@#+@@+-:*%*---·.           ',
  '           --:·::--+%@=:+@%% =+.%···-=%@#@*·-.:.      .: : +@+%=-:·-%  #.·@@+@#=::*%%=:+:+-           ',
  '           -. .:+==--**::#@@@ + .+*=++=+%+@@@# =.     = =#@@@#+·:··--  #. @*%%=-·+@#=-==:-:           ',
  '   .-*#%+- =++.:+:-: :#%=-*@@=·=  *=-:··+@@@@@*=@:.-.=* *@@@@#=--+#.  +. *@@@=-·=#==·--:--* -+%#+-.   ',
  ' :==#%@@#=---=·*-····=+@@#=%@#+·*: .-*@*@@@@@#-*@+=@+=@*·%@@@@@@%:   ·  ·#@@=::-@%=::---=--**%@%#+:·. ',
  '=+***#%@@@%+--*@@*#@%%+@@@%*@+-...:···--+%@@%@=.      .:*@@@@+--· ··. .-=@@*#==+%%@%%%%@@*+###%@@@%#+-',
  ' -=+*#@@@@@==*++@@@@@@%-  .*%%-:··*#@@#**·#@#-  -%%%%#· ·=#@-=+#==*: .#@@@:  ...=%@@*+@#%+:%%%@@@@#+: ',
  '  -+##%@@@%@%%*=*@@@@@@@=   @%=+#%@@@@@@@@*=%  @@=**==@+ :%*@@@@@@@%**%#@*  .@@@@@**#%*+:.·@@@@%#*=·  ',
  '   :-==*%@@+@**=-==+@@@@@-· @@+:=·=#@@@%@@@@= @= =@@@  @# %@@@@@@%**+--*@= =@@@#@@#=:-=****@@%*=-:·   ',
  '    :-=+#@@-+%+#=+-=+=@@+@@-·*@*=+-+=*=+-:##@::=::+==.=+·:%@=:=*@*==+=#+=+*@%*+@@*-#*+%%+=:%#*+===    ',
  '     :-+*#%-·@·-=#*@@#·*%%@%-..==+::=#%@@-#@+-  ·-+#++.  *@@+%@%+:-=+:.·-@@*#%##+*%@*=*:---%%%*-·     ',
  '      .::-+...·:-:--#@*:++#@@%=..:=*@@@@@@@@%@-.       .@@*@@@@@@@=-  =@%%@%#*-:@@*====+:::#*+=.      ',
  '       .:-+*---·:-=-==@%*.-*++%+:+@@@@@@@@::%%+@@·+*.-@*=%. @@@@@@%**+%@@@==·=@*%*=+==·-..·=-:·       ',
  '         ·-:·=+#.+·:=· +@%+:**+*#=@%**=@@·+@@#%@@@@@%@@@+@%. @@=+#@+@#+:-%==@%=#-+*+=*-.+:=·.         ',
  '               :-*--::: ·=*@@@@%@@=*=@@%--@@@@@@@@%@@@@@@@@@:.@@##@#*@@@@@@@%*=-+-=··-=-: .           ',
  '                 .==+#=-=#@@ .=·-%*+#*+.--=@@@@@%%·  =@@@@@@*. .=##%@@+-=..*@#+:-*+--+·.              ',
  '                      ·:·:@   +@.·==:::+@%*%@:-#%#   :@=-*%##=--:. =@%#=.   %=+:-··.                  ',
  '                          -  ·%@@@@@@@%%++*@=--·+@   .#·=-+##%%@@@@@@@@+   .-                         ',
  '                          =:+@@+@*#@@@*=:@@%··-+:*    +-=:.#@%*#@@@#@@@@@: -                          ',
  '                           @@@#@@·-#@@@@@@*=-··.*+    =#::-·#@@@@@=·+@%%@@%                           ',
  '                             @+@@+:%@@@@@@@@*#%+%·     @##@@@@#+*@=:+@@%@@:                           ',
  '                             @@@#+**@@#%@@@@@@@:·       =@@@+-=*@@=-+#@@@:                            ',
  '                              @@=:==@@#*+**#%@%·       :%#-:-+++#@*+=*%@.                             ',
  '                               @@==-%@#%+---=+*%%-   =%%=······+@@=-*%@:                              ',
  '                                +@*+@*-==-·::---*@@#@@--:···.·=+@@-*@#·                               ',
  '                                 ·@@@*:+-:····::.:#@@@#--:·..==-#%@@·                                 ',
  '                                   %@%+==*:·:·.::. :%@@*+-...:-=#@%                                   ',
  '                                    +@##:···..--:++:·=@@@= ··:=@@=                                    ',
  '                                     .##%*::··.-··=*#+-#@@*·=%@%.                                     ',
  '                                       :+%%+=-·:----*+**-%@%@@-                                       ',
  '                                        @@**%%%-.:===:·#*:+@=                                         ',
  '                                       =@@@@*%@@+··-+==-==##:                                         ',
  '                                      ·###@@@@%@@@@-·-==-:++%                                         ',
  '                                     .@==#*%*%@@%#-%@=:+==:.:=                                        ',
  '                                     :@%*·++#@=     ·#@%%#=:-+*                                       ',
  '                                    .*#=:+=**         .*@@@%++@                                       ',
  '                                    .@:==·                :%%+%                                       ',
  '                                     ·.                     ·:+.                                      ',
];

function createAsciiAtlasTexture(chars) {
  const cellW = 64;
  const cellH = 64;
  const canvas = document.createElement('canvas');
  canvas.width = cellW * chars.length;
  canvas.height = cellH;

  const ctx = canvas.getContext('2d');
  if (ctx) {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = '#ffffff';
    ctx.font = '600 48px "IBM Plex Mono", ui-monospace, SFMono-Regular, Menlo, monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    for (let i = 0; i < chars.length; i += 1) {
      ctx.fillText(chars[i], i * cellW + cellW * 0.5, cellH * 0.54);
    }
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.minFilter = THREE.LinearFilter;
  texture.magFilter = THREE.LinearFilter;
  texture.generateMipmaps = false;
  texture.needsUpdate = true;
  return texture;
}

const VERTEX_SHADER = `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = vec4(position.xy, 0.0, 1.0);
  }
`;

const FRAGMENT_SHADER = `
  precision highp float;

  uniform float uTime;
  uniform vec2 uResolution;
  uniform vec2 uGaze;
  uniform float uLocked;
  uniform float uEnraged;
  uniform float uRevealed;
  uniform float uTyping;
  uniform float uBlink;
  uniform sampler2D uAtlas;
  uniform float uCharCount;
  uniform float uCellSize;

  float sampleGlyph(float density, vec2 localUv) {
    float idx = floor(clamp(density, 0.0, 0.999) * uCharCount);
    vec2 atlasUv = vec2((idx + localUv.x) / uCharCount, localUv.y);
    return texture2D(uAtlas, atlasUv).a;
  }

  void main() {
    vec2 cellCoord = floor(gl_FragCoord.xy / uCellSize);
    vec2 cellCenter = (cellCoord + 0.5) * uCellSize;
    vec2 localUv = fract(gl_FragCoord.xy / uCellSize);

    float minDim = min(uResolution.x, uResolution.y);
    vec2 uv = (cellCenter - 0.5 * uResolution.xy) / (minDim * 0.5);
    float r = length(uv);

    // Big sphere radius filling most of the eye canvas
    float eyeR = 0.72;
    float anger = max(uLocked, uEnraged);
    vec3 glowTint = mix(vec3(0.45, 0.95, 0.52), vec3(1.0, 0.14, 0.10), anger);

    // Outer sacred halo ring + crimson aura around the eyeball
    if (r > eyeR) {
      float ringDist = abs(r - 0.87);
      float angle = atan(uv.y, uv.x);
      float ringPulse = sin(angle * 12.0 + uTime * (1.2 + anger * 1.4 + uEnraged * 2.4)) * 0.5 + 0.5;
      float haloRing = exp(-ringDist * 26.0) * (0.42 + 0.38 * ringPulse + uEnraged * 0.25);
      float aura = exp(-(r - eyeR) * 5.2) * (0.28 + uRevealed * 0.14 + anger * 0.22 + uEnraged * 0.24);
      float energy = max(haloRing, aura);
      if (energy < 0.06) discard;

      float glyph = sampleGlyph(clamp(energy * 0.85, 0.12, 0.92), localUv);
      if (glyph < 0.05) discard;

      vec3 ringCol = mix(glowTint, vec3(1.0, 0.92, 0.72), (anger * ringPulse * 0.35) + uEnraged * 0.25);
      gl_FragColor = vec4(ringCol, glyph * clamp(energy * 0.95, 0.0, 0.96));
      return;
    }

    // Angry furrowed frown (uLocked / uEnraged) + periodic organic blink (uBlink)
    float baseUpperLidY = mix(1.05, 0.16 + abs(uv.x) * 0.34, anger);
    baseUpperLidY = mix(baseUpperLidY, 0.05 + abs(uv.x) * 0.42, uEnraged);
    float baseLowerLidY = mix(-1.05, -0.44 + 0.08 * cos(uv.x * 2.4), anger);
    baseLowerLidY = mix(baseLowerLidY, -0.34 + 0.1 * cos(uv.x * 2.4), uEnraged);
    float blinkAmt = uBlink * (1.0 - uEnraged);
    float blinkMeetY = -0.05 + 0.05 * cos(uv.x * 2.2);
    float upperLidY = mix(baseUpperLidY, blinkMeetY, blinkAmt);
    float lowerLidY = mix(baseLowerLidY, blinkMeetY, blinkAmt);
    float aboveUpperLid = uv.y - upperLidY;
    float belowLowerLid = lowerLidY - uv.y;

    // Analytic 3D sphere normal for crisp, fast 60fps eyeball & eyelid shading
    vec2 sphereXY = uv / eyeR;
    float nz = sqrt(max(0.0, 1.0 - dot(sphereXY, sphereXY)));
    vec3 normal = normalize(vec3(sphereXY, nz));
    vec3 viewDir = vec3(0.0, 0.0, 1.0);
    vec3 lightDir = normalize(vec3(0.45 + uGaze.x * 0.35, 0.65 + uGaze.y * 0.3, 1.15));
    float diff = max(dot(normal, lightDir), 0.0);

    // Fill the upper & lower eyelids with shaded ASCII texture (silver-white when calm, crimson when mad)
    float lidActive = max(anger, blinkAmt);
    if (lidActive > 0.01 && r <= eyeR && (aboveUpperLid > -0.025 || belowLowerLid > -0.02)) {
      float lidEdgeDist = aboveUpperLid > -0.025 ? abs(aboveUpperLid) : abs(belowLowerLid);
      float isRim = 1.0 - smoothstep(0.0, 0.085, lidEdgeDist);
      float crease = sin(uv.x * 16.0 + uv.y * 10.0) * 0.5 + 0.5;
      float lidDensity = clamp(0.28 + diff * 0.38 + crease * 0.14 + isRim * 0.32, 0.2, 0.98);
      float lidGlyph = sampleGlyph(lidDensity, localUv);

      vec3 calmLid = mix(vec3(0.38, 0.4, 0.44), vec3(0.84, 0.86, 0.9), clamp(diff * 0.8 + crease * 0.22, 0.0, 1.0));
      vec3 madLid = mix(vec3(0.55, 0.08, 0.08), vec3(1.0, 0.3, 0.25), clamp(diff * 0.8 + crease * 0.25, 0.0, 1.0));
      vec3 lidBase = mix(calmLid, madLid, anger);
      vec3 rimCol = mix(vec3(0.92, 0.98, 0.94), vec3(1.0, 0.22, 0.16), anger);
      vec3 lidCol = mix(lidBase, rimCol, isRim * 0.82);
      gl_FragColor = vec4(lidCol * lidGlyph, 1.0);
      return;
    }

    // Smooth 3D gaze vector tracking cursor or input field
    vec3 eyeDir = normalize(vec3(uGaze.x * 0.82, uGaze.y * 0.82, 1.0));
    vec3 eyeRight = normalize(cross(vec3(0.0, 1.0, 0.0), eyeDir));
    vec3 eyeUp = cross(eyeDir, eyeRight);

    float rx = dot(normal, eyeRight);
    float ry = dot(normal, eyeUp);
    float rz = dot(normal, eyeDir);
    float theta = acos(clamp(rz, -1.0, 1.0));
    float phi = atan(ry, rx);

    vec3 halfVec = normalize(lightDir + viewDir);
    float corneaSpec = pow(max(dot(normal, halfVec), 0.0), 56.0);
    float fresnel = pow(1.0 - max(dot(viewDir, normal), 0.0), 2.3);

    // Dilate slightly when reading input; narrow into a piercing pinpoint glare when locked/enraged
    float pupilRadius = 0.23 + uTyping * 0.045 - anger * 0.055 - uEnraged * 0.04;
    float irisOuter = 0.56;
    float limbalOuter = 0.62;

    // Cast a subtle angry brow shadow across the upper part of the visible eyeball
    float lidShadow = 1.0 - anger * smoothstep(-0.22, -0.02, aboveUpperLid) * (0.55 + uEnraged * 0.2);

    vec3 charColor;
    float density;

    if (theta < pupilRadius) {
      density = 0.06 + corneaSpec * 0.92 + uEnraged * 0.12;
      vec3 pupilBase = mix(vec3(0.08, 0.08, 0.1), vec3(0.28, 0.12, 0.08), anger * 0.6);
      vec3 glintCol = mix(vec3(1.0), vec3(1.0, 0.95, 0.72), anger);
      charColor = mix(pupilBase, glintCol, clamp(corneaSpec * 1.5, 0.0, 1.0));
    } else if (theta < irisOuter) {
      float tIris = (theta - pupilRadius) / (irisOuter - pupilRadius);
      float fibers = sin(phi * 26.0 + sin(theta * 18.0) * 1.4) * 0.5 + 0.5;
      float detail = sin(phi * 13.0 - uTime * (0.9 + anger * 1.2 + uEnraged * 2.4)) * 0.5 + 0.5;
      float innerRing = smoothstep(0.0, 0.25, tIris) * (1.0 - smoothstep(0.75, 1.0, tIris));

      float irisLum = 0.44 + fibers * 0.34 + detail * 0.14 + innerRing * 0.16 + diff * 0.22 + uEnraged * 0.15;
      density = clamp(irisLum + corneaSpec * 0.65, 0.28, 0.999);

      vec3 deepIris = mix(vec3(0.05, 0.34, 0.14), vec3(0.45, 0.03, 0.04), anger);
      vec3 brightIris = mix(vec3(0.46, 0.96, 0.48), vec3(1.0, 0.2, 0.14), anger);
      charColor = mix(deepIris, brightIris, clamp(fibers * 0.78 + innerRing * 0.45, 0.0, 1.0));
      charColor = mix(charColor, vec3(1.0, 0.92, 0.75), uEnraged * innerRing * 0.45);
      charColor = mix(charColor, vec3(1.0), clamp(corneaSpec * 0.95, 0.0, 1.0));
    } else if (theta < limbalOuter) {
      density = 0.2 + corneaSpec * 0.72;
      vec3 limbalBase = mix(vec3(0.05, 0.24, 0.1), vec3(0.28, 0.06, 0.06), anger);
      charColor = mix(limbalBase, vec3(1.0), corneaSpec);
    } else {
      float vein = pow(max(0.0, sin(phi * 14.0 + theta * 8.0) * cos(phi * 9.0 - theta * 12.0)), 6.0);
      float edgeMask = smoothstep(0.76, 1.22, theta);
      float scleraShade = 0.22 + diff * 0.62 + fresnel * 0.18 + corneaSpec * 0.32;
      density = clamp(scleraShade, 0.16, 0.96);

      vec3 scleraBase = mix(vec3(0.45, 0.47, 0.52), vec3(0.95, 0.96, 0.98), clamp(diff * 0.9 + 0.15, 0.0, 1.0));
      scleraBase = mix(scleraBase, vec3(1.0, 0.4, 0.38), anger * 0.35 + uEnraged * 0.25);
      scleraBase = mix(scleraBase, vec3(0.95, 0.18, 0.18), vein * edgeMask * (0.25 + anger * 0.45 + uEnraged * 0.35));
      scleraBase = mix(scleraBase, glowTint, fresnel * (0.32 + uEnraged * 0.25));
      charColor = mix(scleraBase, vec3(1.0), clamp(corneaSpec * 0.8, 0.0, 1.0));
    }

    float glyph = sampleGlyph(density * lidShadow, localUv);
    // Solid opaque black backing inside the eyeball silhouette so wings sit cleanly behind it
    gl_FragColor = vec4(charColor * lidShadow * glyph, 1.0);
  }
`;

// Partition the 102x62 ASCII Ophanim into 7 anatomical wing layers (excluding the carved eye socket)
// so each pair of wings can flap independently around its shoulder pivot near the central eye.
function classifyWingLayer(r, c) {
  // Carve out the center socket for the live Three.js 3D ASCII eyeball
  const dx = (c - 50.5) / 15.2;
  const dy = (r - 32.3) / 7.6;
  if (dx * dx + dy * dy < 1.0) return null;

  const isLeft = c < 51;

  // Bottom crossed wings
  if (r >= 39) return isLeft ? 'bottomLeft' : 'bottomRight';

  // Top soaring pair (center columns above the eye)
  if (r <= 11) return isLeft ? 'topLeft' : 'topRight';
  if (r <= 25) {
    // Inner columns belong to the top pair; outer sweeping columns belong to the upper-middle pair
    if (c >= 30 && c <= 71) return isLeft ? 'topLeft' : 'topRight';
    return isLeft ? 'upperLeft' : 'upperRight';
  }

  // Lower-middle wide-spreading pair (rows 26..38)
  return isLeft ? 'lowerLeft' : 'lowerRight';
}

const WING_KEYS = [
  'topLeft',
  'topRight',
  'upperLeft',
  'upperRight',
  'lowerLeft',
  'lowerRight',
  'bottomLeft',
  'bottomRight',
];

function buildWingLayers() {
  const buckets = Object.fromEntries(WING_KEYS.map((k) => [k, []]));

  for (let r = 0; r < OPHANIM_LINES.length; r += 1) {
    const line = OPHANIM_LINES[r];
    const rowChars = Object.fromEntries(WING_KEYS.map((k) => [k, new Array(line.length).fill(' ')]));

    for (let c = 0; c < line.length; c += 1) {
      const ch = line[c];
      if (ch === ' ') continue;
      const layer = classifyWingLayer(r, c);
      if (layer) rowChars[layer][c] = ch;
    }

    for (const k of WING_KEYS) {
      buckets[k].push(rowChars[k].join(''));
    }
  }

  return buckets;
}

export default function OphanimAscii({
  revealed,
  locked,
  enraged = false,
  pending,
  inputRef,
  isTyping,
  draftLength,
  variant = 'sidebar',
  gazeTargetRef = null,
}) {
  const wingLayers = useMemo(() => buildWingLayers(), []);
  const frameRef = useRef(null);
  const eyeHostRef = useRef(null);
  const wingRefs = useRef({});
  const redrawEyeRef = useRef(null);

  // Live reactive refs read inside the Three.js RAF loop without recreating WebGL context
  const stateRef = useRef({
    revealed: false,
    locked: false,
    enraged: false,
    isTyping: false,
    draftLength: 0,
    pointerX: 0,
    pointerY: 0,
    hasPointer: false,
  });

  useLayoutEffect(() => {
    stateRef.current.revealed = revealed;
    stateRef.current.locked = locked;
    stateRef.current.enraged = enraged;
    redrawEyeRef.current?.();
  }, [revealed, locked, enraged]);

  useEffect(() => {
    stateRef.current.isTyping = isTyping;
    stateRef.current.draftLength = draftLength;
  }, [isTyping, draftLength]);

  // 1. GSAP: Ethereal floating levitation + independent 6-wing 3D flapping choreography
  useEffect(() => {
    const frame = frameRef.current;
    if (!frame) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    const beat = enraged ? 0.82 : locked ? 1.55 : 2.35;
    const amp = enraged ? 1.55 : locked ? 1.25 : 1.0;

    const ctx = gsap.context(() => {
      // Whole-angel buoyant float synchronized with the wingbeats
      gsap.to(frame, {
        y: enraged ? -20 : -16,
        duration: beat,
        ease: 'sine.inOut',
        yoyo: true,
        repeat: -1,
      });

      const flapPair = (leftKey, rightKey, cfg) => {
        const leftEl = wingRefs.current[leftKey];
        const rightEl = wingRefs.current[rightKey];
        if (!leftEl || !rightEl) return;

        gsap.fromTo(
          leftEl,
          { rotateZ: -cfg.zUp * amp, rotateY: cfg.yUp * amp, scaleX: 1 },
          {
            rotateZ: cfg.zDown * amp,
            rotateY: -cfg.yDown * amp,
            scaleX: cfg.squash,
            duration: beat,
            delay: cfg.delay,
            ease: 'sine.inOut',
            yoyo: true,
            repeat: -1,
          },
        );
        gsap.fromTo(
          rightEl,
          { rotateZ: cfg.zUp * amp, rotateY: -cfg.yUp * amp, scaleX: 1 },
          {
            rotateZ: -cfg.zDown * amp,
            rotateY: cfg.yDown * amp,
            scaleX: cfg.squash,
            duration: beat,
            delay: cfg.delay,
            ease: 'sine.inOut',
            yoyo: true,
            repeat: -1,
          },
        );
      };

      // Top soaring wings — regal, slightly trailing
      flapPair('topLeft', 'topRight', {
        zUp: 6,
        zDown: 4,
        yUp: 16,
        yDown: 10,
        squash: 0.95,
        delay: 0,
      });

      // Upper-middle main wings — widest, most expressive beat
      flapPair('upperLeft', 'upperRight', {
        zUp: 11,
        zDown: 8,
        yUp: 24,
        yDown: 16,
        squash: 0.91,
        delay: beat * 0.14,
      });

      // Lower-middle sweeping wings — cascading follow-through
      flapPair('lowerLeft', 'lowerRight', {
        zUp: 7,
        zDown: 9,
        yUp: 20,
        yDown: 14,
        squash: 0.93,
        delay: beat * 0.28,
      });

      // Bottom crossed wings — gentle buoyant tuck
      flapPair('bottomLeft', 'bottomRight', {
        zUp: 3,
        zDown: 4,
        yUp: 10,
        yDown: 8,
        squash: 0.97,
        delay: beat * 0.4,
      });
    }, frameRef);

    return () => ctx.revert();
  }, [locked, enraged]);

  // 2. Anime.js v4: Staggered luminous wave shimmering outward across the wings
  useEffect(() => {
    const frame = frameRef.current;
    if (!frame) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    const layerEls = frame.querySelectorAll('.ophanim-wing-layer');
    if (!layerEls.length) return;

    const anim = animate(layerEls, {
      opacity: [0.74, 1, 0.82],
      duration: enraged ? 950 : locked ? 1800 : 2600,
      delay: stagger(140, { from: 'center' }),
      ease: 'inOutSine',
      loop: true,
      alternate: true,
    });

    return () => {
      anim.pause();
    };
  }, [locked, enraged]);

  // 3. Three.js: Big live 3D ASCII Eyeball that follows cursor OR locks gaze onto input field while typing
  useEffect(() => {
    const host = eyeHostRef.current;
    if (!host) return;

    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const scene = new THREE.Scene();
    const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);

    let renderer;
    try {
      renderer = new THREE.WebGLRenderer({
        antialias: false,
        alpha: true,
        powerPreference: 'high-performance',
      });
    } catch {
      return;
    }

    renderer.setPixelRatio(1);
    host.innerHTML = '';
    host.appendChild(renderer.domElement);

    const atlasTexture = createAsciiAtlasTexture(ASCII_RAMP);
    const uniforms = {
      uTime: { value: 0 },
      uResolution: { value: new THREE.Vector2(240, 240) },
      uGaze: { value: new THREE.Vector2(0, 0) },
      uLocked: { value: 0 },
      uEnraged: { value: 0 },
      uRevealed: { value: 0 },
      uTyping: { value: 0 },
      uBlink: { value: 0 },
      uAtlas: { value: atlasTexture },
      uCharCount: { value: ASCII_RAMP.length },
      uCellSize: { value: 8.5 },
    };

    const geometry = new THREE.PlaneGeometry(2, 2);
    const material = new THREE.ShaderMaterial({
      vertexShader: VERTEX_SHADER,
      fragmentShader: FRAGMENT_SHADER,
      uniforms,
      transparent: true,
      depthWrite: false,
    });

    const quad = new THREE.Mesh(geometry, material);
    scene.add(quad);

    const updateSize = () => {
      const rect = host.getBoundingClientRect();
      const size = Math.max(120, Math.round(Math.min(rect.width || 240, rect.height || 240)));
      renderer.setSize(size, size);
      uniforms.uResolution.value.set(size, size);
      uniforms.uCellSize.value = size < 170 ? 7.0 : 8.5;
    };

    updateSize();

    // Smooth GSAP quickTo for subtle 3D perspective wing tilt toward gaze
    const tiltXTo = frameRef.current && !reducedMotion
      ? gsap.quickTo(frameRef.current, 'rotateY', { duration: 0.7, ease: 'power2.out' })
      : null;
    const tiltYTo = frameRef.current && !reducedMotion
      ? gsap.quickTo(frameRef.current, 'rotateX', { duration: 0.7, ease: 'power2.out' })
      : null;

    const onPointerMove = (event) => {
      stateRef.current.pointerX = event.clientX;
      stateRef.current.pointerY = event.clientY;
      stateRef.current.hasPointer = true;
    };
    window.addEventListener('pointermove', onPointerMove, { passive: true });

    const targetGaze = new THREE.Vector2(0, 0);
    const clock = new THREE.Clock();
    let rafId = 0;
    let blinkCooldown = 2.8 + Math.random() * 3.2;
    let blinkProgress = -1;
    const BLINK_DURATION = 0.22;

    const drawEye = (dt) => {
      uniforms.uTime.value = reducedMotion ? 0 : clock.elapsedTime;

      if (!reducedMotion) {
        if (blinkProgress >= 0) {
          blinkProgress += dt / BLINK_DURATION;
          if (blinkProgress >= 1) {
            blinkProgress = -1;
            uniforms.uBlink.value = 0;
            // Occasional natural double-blink (~18%), otherwise wait 3.5–7.5s
            blinkCooldown = Math.random() < 0.18 ? 0.18 : 3.5 + Math.random() * 4.0;
          } else {
            // Fast close, slightly softer open
            uniforms.uBlink.value = Math.sin(Math.PI * Math.pow(blinkProgress, 0.78));
          }
        } else {
          blinkCooldown -= dt;
          if (blinkCooldown <= 0) {
            blinkProgress = 0;
          }
        }
      }

      const s = stateRef.current;
      const eyeRect = host.getBoundingClientRect();
      const eyeCx = eyeRect.left + eyeRect.width * 0.5;
      const eyeCy = eyeRect.top + eyeRect.height * 0.5;

      // Determine gaze target: explicit external target (e.g. bullet hell player), input field when typing, or cursor
      let tx = eyeCx;
      let ty = eyeCy;
      let hasTarget = false;

      if (gazeTargetRef?.current?.active) {
        tx = gazeTargetRef.current.x;
        ty = gazeTargetRef.current.y;
        hasTarget = true;
      } else if (s.isTyping && inputRef?.current) {
        const inputRect = inputRef.current.getBoundingClientRect();
        // Follow horizontal progress across the input field as the user types!
        const caretRatio = Math.min(0.88, 0.1 + (s.draftLength % 65) / 72);
        tx = inputRect.left + inputRect.width * caretRatio;
        ty = inputRect.top + Math.min(28, inputRect.height * 0.45);
        hasTarget = true;
      } else if (s.hasPointer) {
        tx = s.pointerX;
        ty = s.pointerY;
        hasTarget = true;
      }

      if (hasTarget) {
        const maxDist = Math.max(260, Math.min(window.innerWidth, window.innerHeight) * 0.52);
        const nx = Math.max(-1, Math.min(1, (tx - eyeCx) / maxDist));
        // WebGL Y is up, screen Y is down
        const ny = Math.max(-1, Math.min(1, -(ty - eyeCy) / maxDist));
        targetGaze.set(nx, ny);
      } else {
        targetGaze.set(0, 0);
      }

      const lerpRate = Math.min(1, dt * (gazeTargetRef?.current?.active ? 10 : s.isTyping ? 6.5 : 4.2));
      uniforms.uGaze.value.lerp(targetGaze, reducedMotion ? 1 : lerpRate);
      uniforms.uLocked.value = s.locked ? 1 : 0;
      uniforms.uEnraged.value += ((s.enraged ? 1 : 0) - uniforms.uEnraged.value) * (reducedMotion ? 1 : Math.min(1, dt * 5));
      uniforms.uRevealed.value += ((s.revealed ? 1 : 0) - uniforms.uRevealed.value) * (reducedMotion ? 1 : Math.min(1, dt * 4));
      uniforms.uTyping.value += ((s.isTyping ? 1 : 0) - uniforms.uTyping.value) * Math.min(1, dt * 5);

      if (tiltXTo && tiltYTo) {
        tiltXTo(uniforms.uGaze.value.x * 7.5);
        tiltYTo(uniforms.uGaze.value.y * 5.5);
      }

      renderer.render(scene, camera);
    };

    const renderFrame = () => {
      drawEye(Math.min(clock.getDelta(), 0.05));
      rafId = requestAnimationFrame(renderFrame);
    };

    const redraw = () => drawEye(0);
    redrawEyeRef.current = redraw;
    const resizeObserver = new ResizeObserver(() => {
      updateSize();
      if (reducedMotion) redraw();
    });
    resizeObserver.observe(host);
    redraw();
    if (!reducedMotion) rafId = requestAnimationFrame(renderFrame);

    return () => {
      redrawEyeRef.current = null;
      cancelAnimationFrame(rafId);
      resizeObserver.disconnect();
      window.removeEventListener('pointermove', onPointerMove);
      atlasTexture.dispose();
      geometry.dispose();
      material.dispose();
      renderer.dispose();
    };
  }, [inputRef, gazeTargetRef]);

  const statusText = variant === 'takeover'
    ? '04 / ACADEMIC INTEGRITY VIOLATION · TEACHER ALERT ACTIVE'
    : locked
      ? '03 / SESSION LOCKED · AWAITING CONFESSION'
      : pending
        ? 'OBSERVING PROMPT…'
        : isTyping
          ? 'READING INPUT…'
          : revealed
            ? '02 / CHRIST SEES YOU · ANSWER DEFERRED'
            : 'SERAPHIM · STANDBY';

  return (
    <aside
      className={`ophanim-stage ophanim-variant-${variant}${locked ? ' is-locked' : ''}${enraged ? ' is-enraged' : ''}${revealed ? ' is-revealed' : ''}`}
      aria-label="Campus AI observer"
    >
      <div className="ophanim-scene">
        <div className="ophanim-frame" ref={frameRef}>
          {/* Invisible sizing ghost holds the exact 102x62 monospace bounding box */}
          <pre className="ophanim-art ophanim-sizer" aria-hidden="true">
            {OPHANIM_LINES.join('\n')}
          </pre>
          {WING_KEYS.map((key) => (
            <pre
              key={key}
              ref={(el) => {
                wingRefs.current[key] = el;
              }}
              className={`ophanim-art ophanim-wing-layer ophanim-wing-${key}`}
              aria-hidden="true"
            >
              {wingLayers[key].join('\n')}
            </pre>
          ))}
          <div className="ophanim-eye-host" ref={eyeHostRef} aria-hidden="true" />
        </div>
      </div>
      {variant !== 'boss' && (
        <p className={`ophanim-caption${locked || revealed || enraged ? ' is-alert' : ''}`}>
          {statusText}
        </p>
      )}
    </aside>
  );
}
