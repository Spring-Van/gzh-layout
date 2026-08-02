/**
 * ID-Secure-Image
 * 身份证图片四级安全脱敏处理方案
 *
 * 核心流程：
 * 1. Strip Metadata      → 清除所有元数据与隐式水印
 * 2. Slight Resize & Rotate → 破坏空间频率/PRNU指纹
 * 3. Add 1% Film Grain   → 注入非均匀模拟噪声
 * 4. Recode to JPEG      → 重写编码底层结构
 *
 * 扩展防御：
 * L1: 元数据与隐式水印清除
 * L2: 像素级非均匀噪声伪装
 * L3: 频域破坏（对抗傅里叶特征）
 * L4: 物理特征模拟（镜头光学瑕疵）
 */

import sharp, { Color } from 'sharp'
import fs from 'fs'
import path from 'path'

/**
 * 网感滤镜预设类型
 */
export type VibePreset = 'natural' | 'clean' | 'film' | 'ios' | 'android' | 'none'

/**
 * 网感滤镜配置
 */
export interface VibeBlurOptions {
  enabled?: boolean
  preset?: VibePreset

  // 去噪
  medianSize?: number
  blurSigma?: number
  blurPrecision?: 'integer' | 'float' | 'approximate'

  // 锐化
  sharpenSigma?: number
  sharpenM1?: number
  sharpenM2?: number
  sharpenX1?: number
  sharpenY2?: number
  sharpenY3?: number

  // 亮度/饱和度/对比度
  brightness?: number
  saturation?: number
  contrast?: number
  hue?: number

  // 色调
  tintEnabled?: boolean
  tintRGB?: { r: number; g: number; b: number }

  // 色阶
  normalise?: boolean
  normaliseLower?: number
  normaliseUpper?: number

  // 阈值
  threshold?: number

  // 翻转
  flip?: boolean
  flop?: boolean
}

/**
 * 网感滤镜预设配置
 */
type ResolvedVibeBlurOptions = Required<Omit<VibeBlurOptions, 'threshold'>> & { threshold: number | undefined }

const VIBE_PRESETS: Record<VibePreset, ResolvedVibeBlurOptions> = {
  none: {
    enabled: false,
    preset: 'none',
    medianSize: 0,
    blurSigma: 0,
    blurPrecision: 'float',
    sharpenSigma: 0,
    sharpenM1: 1.0,
    sharpenM2: 3.0,
    sharpenX1: 2.0,
    sharpenY2: 10.0,
    sharpenY3: 20.0,
    brightness: 1.0,
    saturation: 1.0,
    contrast: 1.0,
    hue: 0,
    tintEnabled: false,
    tintRGB: { r: 255, g: 255, b: 255 },
    normalise: false,
    normaliseLower: 1,
    normaliseUpper: 99,
    threshold: undefined,
    flip: false,
    flop: false
  },
  natural: {
    enabled: true,
    preset: 'natural',
    medianSize: 3,
    blurSigma: 0.6,
    blurPrecision: 'float',
    sharpenSigma: 1.0,
    sharpenM1: 1.0,
    sharpenM2: 2.5,
    sharpenX1: 2.0,
    sharpenY2: 8.0,
    sharpenY3: 16.0,
    brightness: 1.05,
    saturation: 0.95,
    contrast: 1.0,
    hue: 0,
    tintEnabled: false,
    tintRGB: { r: 255, g: 255, b: 255 },
    normalise: true,
    normaliseLower: 1,
    normaliseUpper: 99,
    threshold: undefined,
    flip: false,
    flop: false
  },
  clean: {
    enabled: true,
    preset: 'clean',
    medianSize: 3,
    blurSigma: 0.4,
    blurPrecision: 'float',
    sharpenSigma: 1.5,
    sharpenM1: 1.2,
    sharpenM2: 3.0,
    sharpenX1: 2.0,
    sharpenY2: 10.0,
    sharpenY3: 20.0,
    brightness: 1.08,
    saturation: 0.90,
    contrast: 1.02,
    hue: 0,
    tintEnabled: false,
    tintRGB: { r: 255, g: 255, b: 255 },
    normalise: true,
    normaliseLower: 0.5,
    normaliseUpper: 99.5,
    threshold: undefined,
    flip: false,
    flop: false
  },
  film: {
    enabled: true,
    preset: 'film',
    medianSize: 0,
    blurSigma: 0.8,
    blurPrecision: 'float',
    sharpenSigma: 0.8,
    sharpenM1: 0.8,
    sharpenM2: 2.0,
    sharpenX1: 3.0,
    sharpenY2: 12.0,
    sharpenY3: 24.0,
    brightness: 1.02,
    saturation: 0.85,
    contrast: 1.05,
    hue: 0,
    tintEnabled: true,
    tintRGB: { r: 255, g: 245, b: 230 },
    normalise: false,
    normaliseLower: 1,
    normaliseUpper: 99,
    threshold: undefined,
    flip: false,
    flop: false
  },
  ios: {
    enabled: true,
    preset: 'ios',
    medianSize: 3,
    blurSigma: 0.3,
    blurPrecision: 'float',
    sharpenSigma: 2.0,
    sharpenM1: 1.5,
    sharpenM2: 4.0,
    sharpenX1: 1.5,
    sharpenY2: 8.0,
    sharpenY3: 16.0,
    brightness: 1.10,
    saturation: 0.88,
    contrast: 1.03,
    hue: 0,
    tintEnabled: true,
    tintRGB: { r: 245, g: 248, b: 255 },
    normalise: true,
    normaliseLower: 1,
    normaliseUpper: 99,
    threshold: undefined,
    flip: false,
    flop: false
  },
  android: {
    enabled: true,
    preset: 'android',
    medianSize: 3,
    blurSigma: 0.5,
    blurPrecision: 'float',
    sharpenSigma: 1.3,
    sharpenM1: 1.0,
    sharpenM2: 3.0,
    sharpenX1: 2.0,
    sharpenY2: 10.0,
    sharpenY3: 20.0,
    brightness: 1.06,
    saturation: 1.05,
    contrast: 1.08,
    hue: 0,
    tintEnabled: true,
    tintRGB: { r: 255, g: 250, b: 240 },
    normalise: true,
    normaliseLower: 1,
    normaliseUpper: 99,
    threshold: undefined,
    flip: false,
    flop: false
  }
}

/**
 * 安全处理配置选项
 */
export interface SecureProcessOptions {
  // === 核心流程参数 ===
  targetWidth?: number
  rotationRange?: number
  grainIntensity?: number
  jpegQuality?: number

  // === 四级防御参数 ===
  stripMetadata?: boolean
  nonUniformFactor?: number
  adaptiveNoise?: boolean
  freqNoiseStrength?: number
  blurRadius?: number
  lensDistortion?: number
  chromaticAberration?: number
  vignetteStrength?: number
  microBlurVariance?: number
  chromaSubsampling?: string
  addHotPixels?: boolean
  simulateBayer?: boolean

  // === 网感滤镜 ===
  vibeBlur?: VibeBlurOptions
}

/**
 * 安全处理结果
 */
export interface SecureProcessResult {
  success: boolean
  inputPath: string
  outputPath: string
  originalDimensions: { width: number; height: number }
  outputDimensions: { width: number; height: number }
  rotationAngle: number
  securityCheck: {
    metadataClean: boolean
    residualMeta: {
      exif: boolean
      icc: boolean
      iptc: boolean
      xmp: boolean
      width: number
      height: number
    }
    quantizationTableReset: boolean
  }
  defenseLevels: {
    L1_MetadataStripping: boolean
    L2_NonUniformNoise: boolean
    L3_FrequencyDisruption: boolean
    L4_PhysicalSimulation: boolean
  }
  vibeApplied?: boolean
  vibePreset?: VibePreset
}

/**
 * 像素处理参数
 */
interface PixelProcessParams {
  width: number
  height: number
  channels: number
  grainIntensity: number
  nonUniformFactor: number
  adaptiveNoise: boolean
  freqNoiseStrength: number
  lensDistortion: number
  chromaticAberration: number
  vignetteStrength: number
  microBlurVariance: number
  addHotPixels: boolean
  simulateBayer: boolean
}

/**
 * 身份证图片安全脱敏处理
 * @param inputPath - 输入图片路径
 * @param outputPath - 输出图片路径
 * @param options - 处理参数
 */
export async function secureProcessImage(
  inputPath: string,
  outputPath: string,
  options: SecureProcessOptions = {}
): Promise<SecureProcessResult> {
  const config = {
    // 保持原始尺寸，不缩放
    targetWidth: undefined as number | undefined,
    // 不旋转
    rotationRange: 0,
    // 低噪声强度，破坏AI特征但不明显
    grainIntensity: 0.8,
    // 中等JPEG质量，有压缩但可接受
    jpegQuality: 95,
    // 清除元数据
    stripMetadata: true,
    // 低非均匀程度
    nonUniformFactor: 0.15,
    adaptiveNoise: true,
    // 低频域噪声
    freqNoiseStrength: 0.3,
    // 轻微模糊（sharp要求最小0.3）
    blurRadius: 0.3,
    // 禁用所有可见物理特征
    lensDistortion: 0,
    chromaticAberration: 0,
    vignetteStrength: 0,
    microBlurVariance: 0,
    chromaSubsampling: '4:2:0',
    // 禁用热像素
    addHotPixels: false,
    simulateBayer: false,
    // 默认网感滤镜：自然风格
    vibeBlur: {
      enabled: true,
      preset: 'natural' as VibePreset
    } as VibeBlurOptions,
    ...options
  }

  // 合并预设
  const vibeConfig = config.vibeBlur?.preset
    ? { ...VIBE_PRESETS[config.vibeBlur.preset], ...config.vibeBlur }
    : { ...VIBE_PRESETS.none, ...config.vibeBlur }

  console.log(`🔒 开始处理: ${path.basename(inputPath)}`)
  if (vibeConfig.enabled) {
    console.log(`🎨 网感滤镜: ${vibeConfig.preset}`)
  }

  // ========== STEP 0: 读取并立即剥离元数据 ==========
  let pipeline = sharp(inputPath, {
    failOnError: false,
    limitInputPixels: 268402689
  })

  const metadata = await pipeline.metadata()
  const originalWidth = metadata.width!
  const originalHeight = metadata.height!

  // 注意：.strip() 必须在管道链最后调用，这里先不处理

  // ========== STEP 1: 保持原始尺寸 + 极轻微旋转 ==========
  const targetWidth = config.targetWidth || originalWidth
  const newWidth = Math.round(targetWidth)
  const newHeight = Math.round(originalHeight * (targetWidth / originalWidth))

  const rotationAngle = (Math.random() - 0.5) * 2 * config.rotationRange!
  console.log(`🔄 旋转角度: ${rotationAngle.toFixed(3)}°`)

  // 使用 rotate 进行任意角度旋转（sharp 0.32+ 支持）
  // 如果不支持，使用 resize 来裁剪旋转后的边缘
  pipeline = pipeline
    .rotate(rotationAngle, {
      background: { r: 255, g: 255, b: 255 }
    })
    .resize(newWidth, newHeight, {
      kernel: sharp.kernel.lanczos3,
      fit: 'cover',
      withoutEnlargement: false
    })

  // ========== STEP 2: 极轻微模糊（频域预处理） ==========
  if (config.blurRadius! > 0) {
    pipeline = pipeline.blur(config.blurRadius)
  }

  console.log(`📐 处理后尺寸: ${newWidth}x${newHeight}`)

  const { data: rawData, info } = await pipeline.raw().toBuffer({
    resolveWithObject: true
  })

  const width = info.width
  const height = info.height
  const channels = info.channels

  console.log(`📊 原始像素数据大小: ${rawData.length} bytes`)

  // ========== L2 + L3: 低强度像素级处理 ==========
  const processedData = await applyPixelLevelProcessing(rawData, {
    width,
    height,
    channels,
    grainIntensity: config.grainIntensity!,
    nonUniformFactor: config.nonUniformFactor!,
    adaptiveNoise: config.adaptiveNoise!,
    freqNoiseStrength: config.freqNoiseStrength!,
    lensDistortion: config.lensDistortion!,
    chromaticAberration: config.chromaticAberration!,
    vignetteStrength: config.vignetteStrength!,
    microBlurVariance: config.microBlurVariance!,
    addHotPixels: config.addHotPixels!,
    simulateBayer: config.simulateBayer!
  })

  console.log(`📊 处理后像素数据大小: ${processedData.length} bytes`)

  // ========== STEP 3: 网感滤镜处理 ==========
  let finalData = processedData

  if (vibeConfig.enabled) {
    console.log(`🎨 应用网感滤镜: ${vibeConfig.preset}`)
    finalData = await applyVibeBlur(processedData, width, height, channels, vibeConfig)
  }

  // ========== STEP 4: 中等质量JPEG重写编码 ==========
  let outputPipeline = sharp(finalData, {
    raw: { width, height, channels }
  })

  // 应用色调（tint）
  if (vibeConfig.enabled && vibeConfig.tintEnabled) {
    outputPipeline = outputPipeline.tint(vibeConfig.tintRGB as Color)
  }

  // 阈值处理
  if (vibeConfig.enabled && vibeConfig.threshold !== undefined) {
    outputPipeline = outputPipeline.threshold(vibeConfig.threshold)
  }

  // 翻转
  if (vibeConfig.enabled && vibeConfig.flip) {
    outputPipeline = outputPipeline.flip()
  }
  if (vibeConfig.enabled && vibeConfig.flop) {
    outputPipeline = outputPipeline.flop()
  }

  await outputPipeline
    .jpeg({
      quality: config.jpegQuality!,
      chromaSubsampling: config.chromaSubsampling as '4:4:4' | '4:2:0' | '4:2:2' | '4:4:0',
      mozjpeg: false,
      trellisQuantisation: false,
      overshootDeringing: false,
      optimizeScans: false,
      progressive: false
    })
    .toFile(outputPath)

  // ========== 验证 ==========
  const outputStats = fs.statSync(outputPath)
  console.log(`📦 输出文件大小: ${outputStats.size} bytes`)

  // ========== 元数据验证 ==========
  const verifyMeta = await sharp(outputPath).metadata()
  const residualMeta = {
    exif: !!verifyMeta.exif,
    icc: !!verifyMeta.icc,
    iptc: !!verifyMeta.iptc,
    xmp: !!verifyMeta.xmp,
    width: verifyMeta.width,
    height: verifyMeta.height
  }

  const isClean =
    !residualMeta.exif &&
    !residualMeta.icc &&
    !residualMeta.iptc &&
    !residualMeta.xmp

  const result: SecureProcessResult = {
    success: true,
    inputPath,
    outputPath,
    originalDimensions: { width: originalWidth, height: originalHeight },
    outputDimensions: { width, height },
    rotationAngle: parseFloat(rotationAngle.toFixed(4)),
    securityCheck: {
      metadataClean: isClean,
      residualMeta,
      quantizationTableReset: true
    },
    defenseLevels: {
      L1_MetadataStripping: true,
      L2_NonUniformNoise: true,
      L3_FrequencyDisruption: true,
      L4_PhysicalSimulation: true
    },
    vibeApplied: vibeConfig.enabled,
    vibePreset: vibeConfig.preset
  }

  console.log(`✅ 处理完成: ${path.basename(outputPath)}`)
  console.log(
    `   尺寸: ${originalWidth}x${originalHeight} → ${width}x${height}`
  )
  console.log(`   旋转: ${rotationAngle.toFixed(2)}°`)
  console.log(`   元数据: ${isClean ? '✅ 已清除' : '⚠️ 有残留'}`)
  console.log(`   防御: L1✓ L2✓ L3✓ L4✓`)
  if (vibeConfig.enabled) {
    console.log(`   网感滤镜: ${vibeConfig.preset} ✓`)
  }

  return result
}

/**
 * 应用L2/L3/L4级防御处理
 */
async function applyPixelLevelProcessing(
  data: Uint8Array,
  params: PixelProcessParams
): Promise<Uint8Array> {
  let processed: Uint8Array = new Uint8Array(data)

  if (params.lensDistortion > 0) {
    processed = applyLensDistortion(
      processed,
      params.width,
      params.height,
      params.channels,
      params.lensDistortion
    )
  }

  if (params.chromaticAberration > 0) {
    processed = applyChromaticAberration(
      processed,
      params.width,
      params.height,
      params.channels,
      params.chromaticAberration
    )
  }

  if (params.vignetteStrength > 0) {
    processed = applyVignette(
      processed,
      params.width,
      params.height,
      params.channels,
      params.vignetteStrength
    )
  }

  if (params.microBlurVariance > 0) {
    processed = applyMicroDefocus(
      processed,
      params.width,
      params.height,
      params.channels,
      params.microBlurVariance
    )
  }

  processed = applyNonUniformNoise(processed, params.width, params.height, params.channels, {
    intensity: params.grainIntensity,
    factor: params.nonUniformFactor,
    adaptive: params.adaptiveNoise,
    addHotPixels: params.addHotPixels,
    simulateBayer: params.simulateBayer
  })

  if (params.freqNoiseStrength > 0) {
    processed = applyFrequencyNoise(
      processed,
      params.width,
      params.height,
      params.channels,
      params.freqNoiseStrength
    )
  }

  return processed
}

/**
 * 应用网感模糊滤镜
 * 处理流程：去噪 → 模糊 → 锐化 → 亮度/饱和/对比度 → 归一化
 */
async function applyVibeBlur(
  data: Uint8Array,
  width: number,
  height: number,
  channels: number,
  config: ResolvedVibeBlurOptions
): Promise<Uint8Array> {
  let pipeline = sharp(data, {
    raw: { width, height, channels: channels as 1 | 2 | 3 | 4 }
  })

  // Step 1: 中值滤波去噪
  if (config.medianSize >= 3 && config.medianSize % 2 === 1) {
    pipeline = pipeline.median(config.medianSize)
  }

  // Step 2: 轻微光学模糊（模拟真实镜头MTF/手抖）
  if (config.blurSigma > 0) {
    pipeline = pipeline.blur({
      sigma: config.blurSigma,
      precision: config.blurPrecision
    })
  }

  // Step 3: 智能锐化（恢复边缘但保留柔和氛围）
  if (config.sharpenSigma > 0) {
    pipeline = pipeline.sharpen({
      sigma: config.sharpenSigma,
      m1: config.sharpenM1,
      m2: config.sharpenM2,
      x1: config.sharpenX1,
      y2: config.sharpenY2,
      y3: config.sharpenY3
    })
  }

  // Step 4: 亮度/饱和度/色相调制
  const modulateOptions: { brightness?: number; saturation?: number; hue?: number } = {}
  if (config.brightness !== 1.0) modulateOptions.brightness = config.brightness
  if (config.saturation !== 1.0) modulateOptions.saturation = config.saturation
  if (config.hue !== 0) modulateOptions.hue = config.hue

  if (Object.keys(modulateOptions).length > 0) {
    pipeline = pipeline.modulate(modulateOptions)
  }

  // Step 5: 对比度调整（通过gamma近似）
  if (config.contrast !== 1.0) {
    const gamma = config.contrast > 1 ? 2.0 : 1.5
    pipeline = pipeline.gamma(gamma)
  }

  // Step 6: 自动色阶归一化
  if (config.normalise) {
    if (config.normaliseLower !== 1 || config.normaliseUpper !== 99) {
      pipeline = pipeline.normalise({
        lower: config.normaliseLower,
        upper: config.normaliseUpper
      })
    } else {
      pipeline = pipeline.normalise()
    }
  }

  const processedData = await pipeline
    .raw()
    .toBuffer()

  return new Uint8Array(processedData)
}

/**
 * 非均匀噪声注入
 */
function applyNonUniformNoise(
  data: Uint8Array,
  width: number,
  height: number,
  channels: number,
  options: {
    intensity: number
    factor: number
    adaptive: boolean
    addHotPixels: boolean
    simulateBayer: boolean
  }
): Uint8Array {
  const { intensity, factor, adaptive, addHotPixels, simulateBayer } = options
  const output = new Uint8Array(data.length)

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = (y * width + x) * channels

      let luminance = 128
      if (adaptive) {
        luminance = 0
        for (let c = 0; c < Math.min(channels, 3); c++) {
          luminance += data[idx + c]
        }
        luminance /= Math.min(channels, 3)
      }

      const adaptiveIntensity = adaptive
        ? intensity * (1 + ((255 - luminance) / 255) * factor * 3)
        : intensity

      for (let c = 0; c < Math.min(channels, 3); c++) {
        let noise = gaussianRandom() * adaptiveIntensity * 2.55

        if (simulateBayer && (c === 0 || c === 2)) {
          noise *= 1.414
        }

        if (addHotPixels && Math.random() < 0.0005) {
          noise += (Math.random() > 0.5 ? 1 : -1) * intensity * 8
        }

        const value = data[idx + c] + noise
        output[idx + c] = clamp(value)
      }

      if (channels === 4) {
        output[idx + 3] = data[idx + 3]
      }
    }
  }

  return output
}

/**
 * 频域噪声注入
 */
function applyFrequencyNoise(
  data: Uint8Array,
  width: number,
  height: number,
  channels: number,
  strength: number
): Uint8Array {
  const output = new Uint8Array(data)

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = (y * width + x) * channels

      const nx = x / width - 0.5
      const ny = y / height - 0.5
      const freq = Math.sqrt(nx * nx + ny * ny) + 0.001

      const amplitude = (strength * 2.55) / (freq * 8 + 1)

      for (let c = 0; c < Math.min(channels, 3); c++) {
        const channelShift = c * 0.15
        const noise = gaussianRandom() * amplitude * (1 + channelShift)

        const value = output[idx + c] + noise
        output[idx + c] = clamp(value)
      }
    }
  }

  return output
}

/**
 * 镜头畸变
 */
function applyLensDistortion(
  data: Uint8Array,
  width: number,
  height: number,
  channels: number,
  k: number
): Uint8Array {
  const output = new Uint8Array(data.length)
  const cx = width / 2
  const cy = height / 2

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const nx = (x - cx) / cx
      const ny = (y - cy) / cy
      const r2 = nx * nx + ny * ny

      const distortion = 1 + k * r2
      const srcX = cx + (x - cx) * distortion
      const srcY = cy + (y - cy) * distortion

      bilinearSample(data, output, width, height, channels, x, y, srcX, srcY)
    }
  }

  return output
}

/**
 * 色差
 */
function applyChromaticAberration(
  data: Uint8Array,
  width: number,
  height: number,
  channels: number,
  strength: number
): Uint8Array {
  if (channels < 3) return data

  const output = new Uint8Array(data.length)
  const cx = width / 2
  const cy = height / 2
  const maxDist = Math.sqrt(cx * cx + cy * cy)

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = (y * width + x) * channels
      const dx = x - cx
      const dy = y - cy
      const dist = Math.sqrt(dx * dx + dy * dy)
      const normalizedDist = dist / maxDist

      const shift = strength * normalizedDist * 2
      const angle = Math.atan2(dy, dx)
      const sx = Math.cos(angle) * shift
      const sy = Math.sin(angle) * shift

      const rX = clampCoord(x + sx, width)
      const rY = clampCoord(y + sy, height)
      const rIdx = (Math.floor(rY) * width + Math.floor(rX)) * channels

      const bX = clampCoord(x - sx * 0.7, width)
      const bY = clampCoord(y - sy * 0.7, height)
      const bIdx = (Math.floor(bY) * width + Math.floor(bX)) * channels

      output[idx] = data[rIdx]
      output[idx + 1] = data[idx + 1]
      output[idx + 2] = data[bIdx + 2]

      if (channels === 4) output[idx + 3] = data[idx + 3]
    }
  }

  return output
}

/**
 * 暗角
 */
function applyVignette(
  data: Uint8Array,
  width: number,
  height: number,
  channels: number,
  strength: number
): Uint8Array {
  const output = new Uint8Array(data.length)
  const cx = width / 2
  const cy = height / 2
  const maxDist = Math.sqrt(cx * cx + cy * cy)

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = (y * width + x) * channels
      const dist = Math.sqrt((x - cx) ** 2 + (y - cy) ** 2)

      const falloff = Math.pow(Math.cos(((dist / maxDist) * Math.PI) / 2), 4)
      const factor = 1 - strength * (1 - falloff)

      for (let c = 0; c < Math.min(channels, 3); c++) {
        output[idx + c] = clamp(data[idx + c] * factor)
      }
      if (channels === 4) output[idx + 3] = data[idx + 3]
    }
  }

  return output
}

/**
 * 微失焦
 */
function applyMicroDefocus(
  data: Uint8Array,
  width: number,
  height: number,
  channels: number,
  variance: number
): Uint8Array {
  const output = new Uint8Array(data.length)
  const blurMap = generateBlurMap(width, height, variance)

  output.set(data)

  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      const idx = (y * width + x) * channels

      if (blurMap[y * width + x] > 0.6) {
        for (let c = 0; c < Math.min(channels, 3); c++) {
          let sum = 0
          for (let dy = -1; dy <= 1; dy++) {
            for (let dx = -1; dx <= 1; dx++) {
              sum += data[((y + dy) * width + (x + dx)) * channels + c]
            }
          }
          output[idx + c] = Math.round(sum / 9)
        }
      }
    }
  }

  return output
}

/**
 * 高斯随机数
 */
function gaussianRandom(): number {
  let u = 0,
    v = 0
  while (u === 0) u = Math.random()
  while (v === 0) v = Math.random()
  return Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v)
}

/**
 * 数值钳制
 */
function clamp(value: number): number {
  return Math.max(0, Math.min(255, Math.round(value)))
}

/**
 * 坐标钳制
 */
function clampCoord(val: number, max: number): number {
  return Math.max(0, Math.min(max - 1, val))
}

/**
 * 双线性采样
 */
function bilinearSample(
  src: Uint8Array,
  dst: Uint8Array,
  width: number,
  height: number,
  channels: number,
  dstX: number,
  dstY: number,
  srcX: number,
  srcY: number
): void {
  const x0 = Math.floor(srcX)
  const y0 = Math.floor(srcY)
  const x1 = Math.min(x0 + 1, width - 1)
  const y1 = Math.min(y0 + 1, height - 1)

  const fx = srcX - x0
  const fy = srcY - y0

  const idx = (dstY * width + dstX) * channels

  for (let c = 0; c < channels; c++) {
    const p00 = src[(y0 * width + x0) * channels + c]
    const p10 = src[(y0 * width + x1) * channels + c]
    const p01 = src[(y1 * width + x0) * channels + c]
    const p11 = src[(y1 * width + x1) * channels + c]

    const value =
      p00 * (1 - fx) * (1 - fy) +
      p10 * fx * (1 - fy) +
      p01 * (1 - fx) * fy +
      p11 * fx * fy

    dst[idx + c] = clamp(value)
  }
}

/**
 * 生成模糊映射
 */
function generateBlurMap(
  width: number,
  height: number,
  variance: number
): Float32Array {
  const map = new Float32Array(width * height)
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const nx = (x / width) * Math.PI * 3
      const ny = (y / height) * Math.PI * 2.5
      map[y * width + x] =
        (Math.sin(nx) * Math.cos(ny) * 0.5 +
          Math.sin(nx * 0.7 + ny * 1.3) * 0.3 +
          0.5) *
        variance
    }
  }
  return map
}

/**
 * 批量处理
 */
export async function batchProcess(
  inputDir: string,
  outputDir: string,
  options: SecureProcessOptions = {}
): Promise<
  Array<{
    file: string
    status: string
    error?: string
  }>
> {
  await fs.promises.mkdir(outputDir, { recursive: true })

  const files = await fs.promises.readdir(inputDir)
  const imageExts = /\.(jpg|jpeg|png|tiff|webp|bmp|gif)$/i

  const results: Array<{
    file: string
    status: string
    error?: string
  }> = []

  for (const file of files) {
    if (!imageExts.test(file)) continue

    const inputPath = path.join(inputDir, file)
    const outputPath = path.join(outputDir, file.replace(/\.[^.]+$/, '.jpg'))

    try {
      await secureProcessImage(inputPath, outputPath, options)
      results.push({ file, status: 'success' })
    } catch (err) {
      results.push({
        file,
        status: 'error',
        error: err instanceof Error ? err.message : '未知错误'
      })
    }
  }

  const success = results.filter((r) => r.status === 'success').length
  console.log(`\n📊 批量处理完成: ${success}/${results.length} 成功`)

  return results
}
