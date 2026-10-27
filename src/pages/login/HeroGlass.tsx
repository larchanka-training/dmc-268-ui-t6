// Копия `landing/src/components/HeroGlass.tsx`: лендинг живёт отдельным пакетом, поэтому импортировать
// его напрямую нельзя. Отличия от лендинга:
// 1. сила приглушения под текстом вынесена в параметр `dim`;
// 2. контекст WebGL при размонтировании не закрывается (см. комментарий в очистке эффекта);
// 3. если шейдер не собрался, цикл кадров останавливается, а не ждёт его вечно;
// 4. настройка «уменьшить движение» отслеживается по событию, без хука лендинга.
import { useEffect, useRef } from 'react'

import styles from './HeroGlass.module.css'

const VERT = `attribute vec2 p; void main(){ gl_Position = vec4(p, 0., 1.); }`

/**
 * Один полноэкранный фрагментный шейдер: анимированное световое поле за рядом диагональных стеклянных
 * полос (идея hero у Raycast, но без three.js). Всё считается попиксельно за один проход.
 */
const FRAG = `
precision highp float;
uniform vec2 uRes;      // canvas size, device px
uniform float uScale;   // device px per CSS px
uniform float uTime;
uniform vec2 uMouse;    // smoothed cursor, -1..1
uniform float uIntro;   // 0..1, the background fades in from the dark
uniform float uMobile;  // 1 on narrow screens
uniform vec3 uDim;      // dimming under the text: light factor, ceiling, falloff radius
uniform vec4 uText;     // heading block: center x, center y (from the top), radius x, radius y; CSS px

const float CA = 0.035;    // how far apart the blue copies of the rim are
const float GRAIN = 0.3;   // how strongly soft edges break up into dots
const float ANGLE = 0.73;  // slope of the stripes, ~42°, as the former CSS rays

float hash(vec2 p) { return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453); }
mat2 rot(float a) { float c = cos(a), s = sin(a); return mat2(c, -s, s, c); }

// A field of three waves, as at Raycast, as a scalar
float plasma(vec2 p, float t) {
  float h = cos(3.0 * p.x + t);
  float d = cos(p.x * cos(t) + 5.0 * p.y * sin(t) + t);
  float x = 0.3 * p.x - 0.5 + cos(t), y = 0.3 * p.y - 0.5 + sin(t * 0.5);
  float r = sin(20.0 * sqrt(x * x + y * y + 1.0) + t);
  return smoothstep(0.15, 0.85, ((h + d + r) / 3.0 + 1.0) * 0.5);
}

// Light behind the glass: three soft spots on slow orbits. Coming close they merge into one,
// moving apart they open dark islands between them. The cursor pulls them slightly along.
float patches(vec2 p, float t) {
  vec2 m = uMouse * 0.22;
  float spread = mix(1.0, 0.45, uMobile);
  vec2 c1 = vec2((-0.75 + 0.30 * sin(t * 0.11)) * spread, 0.10 + 0.28 * cos(t * 0.13)) + m;
  vec2 c2 = vec2((0.70 + 0.28 * cos(t * 0.09 + 1.0)) * spread, -0.15 + 0.30 * sin(t * 0.12 + 2.0)) + m;
  vec2 c3 = vec2(0.55 * sin(t * 0.07 + 4.0) * spread, 0.38 * cos(t * 0.10 + 1.0)) + m * 1.4;
  float f = exp(-dot(p - c1, p - c1) / 0.20) + exp(-dot(p - c2, p - c2) / 0.20) + exp(-dot(p - c3, p - c3) / 0.14);
  return smoothstep(0.30, 0.85, f);
}

// Lens profile across one stripe, f in -1..1: refraction grows towards the edge
float lens(float f) { return f * (0.55 + 0.9 * f * f); }

float field(vec2 p, float t) {
  vec2 q = rot(ANGLE) * p;
  float w = 0.36, s = q.x / w;
  float f = fract(s) * 2.0 - 1.0;
  vec2 sp = rot(-ANGLE) * vec2((floor(s) + 0.5 + lens(f) * 1.5) * w, q.y);
  float v = (0.35 + 0.65 * plasma((sp - uMouse * 0.12) * 1.2, t * 0.07)) * patches(sp, t);
  // glass shading: darker towards both edges, a thin highlight on one side, a slight spread per stripe
  v = v * (1.0 - 0.8 * pow(abs(f), 5.0)) + smoothstep(0.93, 1.0, -f) * 0.06;
  v *= 0.8 + 0.4 * hash(vec2(floor(s), 1.0));
  // intro: stripes light up one by one from the middle out and stretch along the diagonal
  float k = smoothstep(0.0, 1.0, (uIntro - abs(floor(s) + 0.5) * 0.07) / 0.55);
  return v * k * smoothstep(k * 3.4, k * 3.4 - 0.9, abs(q.y));
}

// Landing palette: --bg -> #1e3a8a -> --blue -> --glow -> #dbeafe
vec3 ramp(float v) {
  v = clamp(v, 0.0, 1.0);
  vec3 c0 = vec3(0.035, 0.051, 0.094), c1 = vec3(0.118, 0.227, 0.541), c2 = vec3(0.145, 0.388, 0.922),
       c3 = vec3(0.376, 0.647, 0.980), c4 = vec3(0.859, 0.918, 0.996);
  if (v < 0.25) return mix(c0, c1, v * 4.0);
  if (v < 0.5) return mix(c1, c2, (v - 0.25) * 4.0);
  if (v < 0.75) return mix(c2, c3, (v - 0.5) * 4.0);
  return mix(c3, c4, (v - 0.75) * 4.0);
}

void main() {
  vec2 size = uRes / uScale;
  vec2 px = vec2(gl_FragCoord.x, uRes.y - gl_FragCoord.y) / uScale;   // CSS px from the top left corner

  // The same ellipse as in the ray mask: radial-gradient(ellipse 58% 62% at 50% 42%, #000 30%, transparent 78%)
  // (on a phone 90% 36% at 50% 25%). It ends inside the canvas, and at zero the shader returns exactly --bg,
  // so the picture dissolves into the page background with no visible border.
  vec2 c = size * vec2(0.5, mix(0.42, 0.25, uMobile));
  vec2 e = size * mix(vec2(0.58, 0.62), vec2(0.9, 0.36), uMobile);
  float vig = 1.0 - smoothstep(0.30, 0.78, length((px - c) / e));

  vec2 uv = vec2(px.x - c.x, c.y - px.y) / mix(450.0, 300.0, uMobile);

  // Aberration in the blue range: two shifted copies of the shape give a dark blue rim on one side
  // and a light blue one on the other. The rim starts closed and opens as the background appears.
  vec2 dir = vec2(1.0, -0.45) * CA * (0.6 + 0.6 * length(uv)) * mix(0.15, 1.0, smoothstep(0.3, 1.0, uIntro));
  vec3 v = clamp(vec3(field(uv - dir * 1.6, uTime), field(uv, uTime), field(uv + dir, uTime)), 0.0, 1.0);
  v *= vig * smoothstep(0.0, 0.5, uIntro) * mix(0.9, 0.7, uMobile);

  // Under the heading the light is dimmed and capped at a medium blue: text never sits on near white
  float tm = smoothstep(uDim.z, 0.45, length((px - uText.xy) / uText.zw));
  v = min(v * mix(1.0, uDim.x, tm), vec3(mix(0.9, uDim.y, tm)));

  // Grain is stronger in half tones: dense centers stay solid, soft edges break up into dots
  float n = hash(floor(gl_FragCoord.xy / max(uScale, 1.0)) + 3.7) - 0.5;
  v += n * GRAIN * (0.06 * vig + 4.0 * v * (1.0 - v));

  vec3 col = ramp(v.g);
  col += vec3(0.07, 0.16, 0.62) * clamp(v.r - v.g, 0.0, 1.0) * 1.6;
  col += vec3(0.10, 0.42, 0.62) * clamp(v.b - v.g, 0.0, 1.0) * 1.1;
  gl_FragColor = vec4(col, 1.0);
}`

// Фон стартует вместе с текстом и ещё какое-то время разгорается после него; время считается
// шагами с ограничением, чтобы медленный первый кадр не дал анимации перепрыгнуть вперёд.
const INTRO_MS = 4600
const UNIFORMS = [
  'uRes',
  'uScale',
  'uTime',
  'uMouse',
  'uIntro',
  'uMobile',
  'uText',
  'uDim',
] as const

function compile(gl: WebGLRenderingContext, type: number, source: string) {
  const shader = gl.createShader(type)
  if (!shader) return null
  gl.shaderSource(shader, source)
  gl.compileShader(shader)
  return shader
}

type ProgramState = 'pending' | 'ready' | 'failed'

/**
 * Фон Hero: диагональные стеклянные полосы, за которыми перетекает свет (WebGL, один шейдер).
 * `textSelector` — блок заголовка, под которым свет должен оставаться приглушённым.
 */
export interface HeroGlassProps {
  /** Блок с текстом, под которым свет остаётся приглушённым. */
  textSelector: string
  /**
   * Приглушение под текстом: множитель света, потолок яркости и радиус затухания. По умолчанию
   * значения hero лендинга; форме входа нужно темнее и шире.
   */
  dim?: readonly [number, number, number]
}

const LANDING_DIM = [0.72, 0.44, 1.3] as const

export function HeroGlass({ textSelector, dim = LANDING_DIM }: HeroGlassProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [dimX, dimY, dimZ] = dim

  useEffect(() => {
    const canvas = canvasRef.current
    const motion = window.matchMedia('(prefers-reduced-motion: reduce)')
    let reduced = motion.matches
    const gl = canvas?.getContext('webgl', {
      antialias: false,
      alpha: false,
      powerPreference: 'low-power',
    })
    if (!canvas || !gl) return

    const vert = compile(gl, gl.VERTEX_SHADER, VERT)
    const frag = compile(gl, gl.FRAGMENT_SHADER, FRAG)
    const program = gl.createProgram()
    if (!vert || !frag) return
    gl.attachShader(program, vert)
    gl.attachShader(program, frag)
    gl.linkProgram(program)

    const coarse = window.matchMedia('(pointer: coarse)').matches
    // Разрешение рендера относительно CSS px. На телефоне 1x (зерно это скрывает), чтобы скролл был
    // плавным; если кадры идут медленно, оно снижается дальше.
    let scale = coarse ? 1 : Math.min(window.devicePixelRatio || 1, 1.5)
    const target = { x: 0, y: 0 }
    const mouse = { x: 0, y: 0 }
    let visible = true
    let raf = 0
    let elapsed = 0
    let uniforms: (WebGLUniformLocation | null)[] | null = null

    // Компиляция шейдера на телефоне может занять время. С KHR_parallel_shader_compile браузер делает её
    // вне главного потока, а мы просто ждём — анимация заголовка, идущая в это же время, не дёргается.
    const parallel = gl.getExtension('KHR_parallel_shader_compile')
    let failed = false
    const programState = (): ProgramState => {
      if (uniforms) return 'ready'
      if (failed) return 'failed'
      if (parallel && !gl.getProgramParameter(program, parallel.COMPLETION_STATUS_KHR)) {
        return 'pending'
      }
      // Шейдер мог не собраться (например, нет `highp` во фрагментном шейдере): фон остаётся
      // тёмным, цикл кадров больше не запускается.
      if (
        !gl.getShaderParameter(vert, gl.COMPILE_STATUS) ||
        !gl.getShaderParameter(frag, gl.COMPILE_STATUS) ||
        !gl.getProgramParameter(program, gl.LINK_STATUS)
      ) {
        failed = true
        return 'failed'
      }
      gl.useProgram(program)
      gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer())
      gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW)
      const position = gl.getAttribLocation(program, 'p')
      gl.enableVertexAttribArray(position)
      gl.vertexAttribPointer(position, 2, gl.FLOAT, false, 0, 0)
      uniforms = UNIFORMS.map((name) => gl.getUniformLocation(program, name))
      return 'ready'
    }
    let last = 0
    let slow = 0

    const draw = (ms: number) => {
      if (!uniforms) return
      const [uRes, uScale, uTime, uMouse, uIntro, uMobile, uText, uDim] = uniforms
      const width = Math.round(canvas.clientWidth * scale)
      const height = Math.round(canvas.clientHeight * scale)
      if (canvas.width !== width || canvas.height !== height) {
        canvas.width = width
        canvas.height = height
        gl.viewport(0, 0, width, height)
      }

      // Положение блока заголовка внутри канваса: приглушённая зона следует за реальной вёрсткой
      const box = canvas.getBoundingClientRect()
      // (объединение его детей: сам блок — контейнер во всю ширину)
      const rects = Array.from(document.querySelector(textSelector)?.children ?? [], (child) =>
        child.getBoundingClientRect(),
      )
      if (rects.length > 0) {
        const left = Math.min(...rects.map((rect) => rect.left))
        const right = Math.max(...rects.map((rect) => rect.right))
        const top = Math.min(...rects.map((rect) => rect.top))
        const bottom = Math.max(...rects.map((rect) => rect.bottom))
        gl.uniform4f(
          uText ?? null,
          (left + right) / 2 - box.left,
          (top + bottom) / 2 - box.top,
          (right - left) * 0.62,
          (bottom - top) * 0.8,
        )
      }

      const progress = reduced ? 1 : Math.min(elapsed / INTRO_MS, 1)
      gl.uniform3f(uDim ?? null, dimX, dimY, dimZ)
      gl.uniform2f(uRes ?? null, width, height)
      gl.uniform1f(uScale ?? null, scale)
      gl.uniform1f(uTime ?? null, ms / 1000 + 30)
      gl.uniform2f(uMouse ?? null, mouse.x, mouse.y)
      gl.uniform1f(uIntro ?? null, 1 - (1 - progress) ** 2.4)
      gl.uniform1f(uMobile ?? null, canvas.clientWidth <= 640 ? 1 : 0)
      gl.drawArrays(gl.TRIANGLES, 0, 3)
    }

    const frame = (ms: number) => {
      const state = programState()
      if (state === 'failed') {
        raf = 0
        return
      }
      if (state === 'pending') {
        last = ms
        raf = requestAnimationFrame(frame)
        return
      }
      elapsed += Math.min(ms - last, 100)
      // Свет догоняет курсор медленно (~0,9 с): перетекает, а не прыгает
      const ease = 1 - Math.exp(-Math.min(ms - last, 100) / 900)
      mouse.x += (target.x - mouse.x) * ease
      mouse.y += (target.y - mouse.y) * ease
      draw(ms)

      const dt = ms - last
      if (dt > 24 && dt < 200) {
        slow += 1
        if (slow > 20 && scale > 0.5) {
          scale *= 0.8
          slow = 0
        }
      } else if (slow > 0) slow -= 1
      last = ms
      raf = visible && !reduced ? requestAnimationFrame(frame) : 0
    }

    const onMove = (event: PointerEvent) => {
      target.x = (event.clientX / window.innerWidth) * 2 - 1
      target.y = -((event.clientY / window.innerHeight) * 2 - 1)
    }
    const onResize = () => {
      if (!raf && !failed) raf = requestAnimationFrame(frame)
    }
    const onMotionChange = () => {
      reduced = motion.matches
      window.removeEventListener('pointermove', onMove)
      if (!coarse && !reduced) window.addEventListener('pointermove', onMove)
      if (!raf && !failed) raf = requestAnimationFrame(frame)
    }
    // Пока Hero прокручен за пределы экрана, ничего не рисуется
    const observer = new IntersectionObserver(([entry]) => {
      visible = entry?.isIntersecting ?? true
      if (visible && !raf && !failed) raf = requestAnimationFrame(frame)
    })

    observer.observe(canvas)
    window.addEventListener('resize', onResize)
    motion.addEventListener('change', onMotionChange)
    if (!coarse && !reduced) window.addEventListener('pointermove', onMove)
    raf = requestAnimationFrame(frame)

    return () => {
      cancelAnimationFrame(raf)
      observer.disconnect()
      window.removeEventListener('resize', onResize)
      motion.removeEventListener('change', onMotionChange)
      window.removeEventListener('pointermove', onMove)
      // В отличие от лендинга контекст здесь не закрывается: в режиме разработки React запускает
      // эффект дважды, и второй запуск получил бы уже потерянный контекст (белый холст). Канвас
      // удаляется вместе со страницей, контекст освобождает браузер.
    }
  }, [textSelector, dimX, dimY, dimZ])

  return (
    <div className={styles.wrap} aria-hidden="true">
      <canvas ref={canvasRef} className={styles.canvas} />
    </div>
  )
}
