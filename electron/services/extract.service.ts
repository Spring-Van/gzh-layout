import fs from 'fs-extra';
import path from 'path';
import http from 'http';
import https from 'https';
import { net } from 'electron';
import { nanoid } from 'nanoid';
import * as cheerio from 'cheerio';

export interface ExtractedImage {
  id: string;
  url: string;
  originalUrl: string;
  filename: string;
  platform: string;
  downloaded: boolean;
  localPath?: string;
  error?: string;
}

export interface ExtractTask {
  id: string;
  url: string;
  platform: string;
  status: 'pending' | 'parsing' | 'downloading' | 'completed' | 'failed';
  images: ExtractedImage[];
  error?: string;
  logs?: string[];
}

export type Platform = 'wechat' | 'xiaohongshu' | 'douyin' | 'weibo' | 'unknown';

export type LogCallback = (message: string) => void;

const PLATFORM_PATTERNS: Record<Platform, RegExp[]> = {
  wechat: [
    /mp\.weixin\.qq\.com\/s/,
    /weixin\.qq\.com\/s\//,
  ],
  xiaohongshu: [
    /xiaohongshu\.com\/explore/,
    /xiaohongshu\.com\/discovery\/item/,
    /xhslink\.com/,
  ],
  douyin: [
    /douyin\.com\/video/,
    /iesdouyin\.com/,
    /v\.douyin\.com/,
  ],
  weibo: [
    /weibo\.com\/\d+/,
    /m\.weibo\.cn\/detail/,
  ],
  unknown: [],
};

const DEFAULT_HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
  'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8',
};

export class ExtractService {
  static detectPlatform(url: string): Platform {
    for (const [platform, patterns] of Object.entries(PLATFORM_PATTERNS)) {
      for (const pattern of patterns) {
        if (pattern.test(url)) {
          return platform as Platform;
        }
      }
    }
    return 'unknown';
  }

  static async fetchPage(url: string, headers?: Record<string, string>, log?: LogCallback): Promise<string> {
    log?.(`[fetchPage] 开始请求: ${url}`);
    
    return new Promise((resolve, reject) => {
      const request = net.request({
        url,
        method: 'GET',
      });

      const mergedHeaders = { ...DEFAULT_HEADERS, ...headers };
      for (const [key, value] of Object.entries(mergedHeaders)) {
        request.setHeader(key, value);
      }

      let responseData = '';
      let timeoutId: NodeJS.Timeout | null = null;

      const cleanup = () => {
        if (timeoutId) {
          clearTimeout(timeoutId);
          timeoutId = null;
        }
      };

      timeoutId = setTimeout(() => {
        request.abort();
        reject(new Error('请求超时'));
      }, 15000);

      request.on('response', (response) => {
        log?.(`[fetchPage] 收到响应: HTTP ${response.statusCode}`);
        
        response.on('data', (chunk) => {
          responseData += chunk.toString();
        });

        response.on('end', () => {
          cleanup();
          log?.(`[fetchPage] 响应完成, 数据长度: ${responseData.length}`);
          
          if (response.statusCode === 200) {
            resolve(responseData);
          } else {
            reject(new Error(`HTTP ${response.statusCode}`));
          }
        });
      });

      request.on('error', (error) => {
        cleanup();
        log?.(`[fetchPage] 请求失败: ${error.message}`);
        reject(error);
      });

      request.end();
    });
  }

  static async getRedirectUrl(url: string, log?: LogCallback): Promise<string> {
    log?.(`[getRedirectUrl] 检查重定向: ${url}`);
    
    return new Promise((resolve) => {
      const urlObj = new URL(url);
      const requestModule = urlObj.protocol === 'https:' ? https : http;
      
      let resolved = false;
      let timeoutId: NodeJS.Timeout | null = null;
      
      const cleanup = () => {
        if (timeoutId) {
          clearTimeout(timeoutId);
          timeoutId = null;
        }
      };
      
      const resolveOnce = (result: string) => {
        if (!resolved) {
          resolved = true;
          cleanup();
          resolve(result);
        }
      };
      
      const request = requestModule.get(url, {
        headers: {
          'User-Agent': DEFAULT_HEADERS['User-Agent'],
        },
        timeout: 8000,
      }, (response) => {
        log?.(`[getRedirectUrl] 响应状态: ${response.statusCode}`);
        
        if (response.statusCode === 301 || response.statusCode === 302 || 
            response.statusCode === 303 || response.statusCode === 307 || response.statusCode === 308) {
          const location = response.headers.location;
          if (location) {
            const redirectUrl = location.startsWith('http') ? location : new URL(location, url).href;
            log?.(`[getRedirectUrl] 重定向到: ${redirectUrl}`);
            resolveOnce(redirectUrl);
            return;
          }
        }
        
        log?.(`[getRedirectUrl] 没有重定向，返回原URL`);
        resolveOnce(url);
      });

      request.on('error', (error) => {
        log?.(`[getRedirectUrl] 请求失败: ${error.message}`);
        resolveOnce(url);
      });
      
      timeoutId = setTimeout(() => {
        log?.(`[getRedirectUrl] 请求超时`);
        request.destroy();
        resolveOnce(url);
      }, 8000);
    });
  }

  static async parseWechat(url: string, log?: LogCallback): Promise<string[]> {
    log?.('[parseWechat] 开始解析微信公众号');
    
    try {
      const html = await this.fetchPage(url, {
        'Referer': 'https://mp.weixin.qq.com/',
      }, log);
      
      log?.(`[parseWechat] HTML 长度: ${html.length}`);
      log?.(`[parseWechat] HTML 前500字符: ${html.substring(0, 500)}`);
      
      const $ = cheerio.load(html);
      const imageUrls: Set<string> = new Set();

      // 尝试从 #js_content 中获取图片
      const jsContentImages = $('#js_content img');
      log?.(`[parseWechat] #js_content img 数量: ${jsContentImages.length}`);
      
      jsContentImages.each((i, el) => {
        const src = $(el).attr('data-src') || $(el).attr('src');
        log?.(`[parseWechat] 图片 ${i}: src=${src}`);
        
        if (src && !src.startsWith('data:')) {
          const normalizedUrl = src.startsWith('//') ? 'https:' + src : src;
          imageUrls.add(normalizedUrl);
        }
      });

      // 如果没有找到，尝试查找所有 mmbiz.qpic.cn 的图片
      if (imageUrls.size === 0) {
        log?.('[parseWechat] #js_content 未找到图片，尝试查找所有 mmbiz 图片');
        
        $('img').each((_, el) => {
          const src = $(el).attr('data-src') || $(el).attr('src');
          if (src && !src.startsWith('data:') && src.includes('mmbiz.qpic.cn')) {
            const normalizedUrl = src.startsWith('//') ? 'https:' + src : src;
            imageUrls.add(normalizedUrl);
            log?.(`[parseWechat] 找到 mmbiz 图片: ${normalizedUrl}`);
          }
        });
      }

      log?.(`[parseWechat] 最终找到 ${imageUrls.size} 张图片`);
      return Array.from(imageUrls);
    } catch (error) {
      log?.(`[parseWechat] 解析失败: ${error}`);
      throw error;
    }
  }

  static async parseXiaohongshu(url: string, log?: LogCallback): Promise<string[]> {
    log?.('[parseXiaohongshu] 开始解析小红书');
    
    try {
      let realUrl = url;
      if (url.includes('xhslink.com')) {
        log?.('[parseXiaohongshu] 检测到短链，获取重定向URL');
        realUrl = await this.getRedirectUrl(url, log);
        log?.(`[parseXiaohongshu] 重定向后URL: ${realUrl}`);
      }

      const html = await this.fetchPage(realUrl, {
        'Referer': 'https://www.xiaohongshu.com/',
      }, log);
      
      log?.(`[parseXiaohongshu] HTML 长度: ${html.length}`);
      log?.(`[parseXiaohongshu] HTML 前1000字符: ${html.substring(0, 1000)}`);
      
      const $ = cheerio.load(html);
      const imageUrls: string[] = [];

      // 查找 __INITIAL_STATE__ 脚本
      const scripts = $('script');
      log?.(`[parseXiaohongshu] 找到 ${scripts.length} 个 script 标签`);
      
      let scriptContentStr = '';
      scripts.each((i, el) => {
        const content = $(el).html() || '';
        if (content.includes('__INITIAL_STATE__')) {
          scriptContentStr = content;
          log?.(`[parseXiaohongshu] 找到 __INITIAL_STATE__ 在 script[${i}]`);
          log?.(`[parseXiaohongshu] script 内容前500字符: ${content.substring(0, 500)}`);
        }
      });

      if (scriptContentStr) {
        const jsonMatch = scriptContentStr.match(/__INITIAL_STATE__\s*=\s*({.+?})\s*;?\s*$/s);
        if (jsonMatch) {
          log?.('[parseXiaohongshu] 成功匹配 JSON');
          let jsonStr = jsonMatch[1];
          jsonStr = jsonStr.replace(/undefined/g, 'null');

          try {
            const state = JSON.parse(jsonStr);
            log?.(`[parseXiaohongshu] JSON 解析成功，keys: ${Object.keys(state)}`);
            
            const noteDetailMap = state?.note?.noteDetailMap;
            if (noteDetailMap) {
              const noteId = Object.keys(noteDetailMap)[0];
              log?.(`[parseXiaohongshu] noteId: ${noteId}`);
              
              const noteData = noteDetailMap[noteId]?.note;
              if (noteData?.imageList) {
                log?.(`[parseXiaohongshu] 找到 imageList, 长度: ${noteData.imageList.length}`);
                
                for (const img of noteData.imageList) {
                  const imgUrl = img.urlDefault || img.url || '';
                  if (imgUrl) {
                    imageUrls.push(imgUrl);
                    log?.(`[parseXiaohongshu] 图片URL: ${imgUrl}`);
                  }
                }
              } else {
                log?.('[parseXiaohongshu] 未找到 imageList');
              }
            } else {
              log?.('[parseXiaohongshu] 未找到 noteDetailMap');
            }
          } catch (e) {
            log?.(`[parseXiaohongshu] JSON 解析失败: ${e}`);
          }
        } else {
          log?.('[parseXiaohongshu] JSON 正则匹配失败');
        }
      } else {
        log?.('[parseXiaohongshu] 未找到 __INITIAL_STATE__');
      }

      // 如果没有从 JSON 获取到，尝试从 DOM 获取
      if (imageUrls.length === 0) {
        log?.('[parseXiaohongshu] 尝试从 DOM 获取图片');
        
        $('img').each((_, el) => {
          const src = $(el).attr('src') || $(el).attr('data-src');
          if (src && !src.startsWith('data:') && 
              (src.includes('sns-webpic-qc.xhscdn.com') || 
               src.includes('ci.xiaohongshu.com'))) {
            imageUrls.push(src);
            log?.(`[parseXiaohongshu] DOM 图片: ${src}`);
          }
        });
      }

      log?.(`[parseXiaohongshu] 最终找到 ${imageUrls.length} 张图片`);
      return imageUrls;
    } catch (error) {
      log?.(`[parseXiaohongshu] 解析失败: ${error}`);
      throw error;
    }
  }

  static async parseDouyin(url: string, log?: LogCallback): Promise<string[]> {
    log?.('[parseDouyin] 开始解析抖音');
    
    try {
      let realUrl = url;
      if (url.includes('v.douyin.com')) {
        log?.('[parseDouyin] 检测到短链，获取重定向URL');
        realUrl = await this.getRedirectUrl(url, log);
        log?.(`[parseDouyin] 重定向后URL: ${realUrl}`);
      }

      // 从 URL 中提取 video ID
      const videoIdMatch = realUrl.match(/(?:video|note)\/(\d+)/);
      if (!videoIdMatch) {
        log?.('[parseDouyin] 无法从URL提取video ID');
        throw new Error('无法从URL提取video ID');
      }
      const videoId = videoIdMatch[1];
      log?.(`[parseDouyin] 提取到 video ID: ${videoId}`);
      
      // 构造正确的请求URL
      const apiUrl = `https://www.iesdouyin.com/share/video/${videoId}/`;
      log?.(`[parseDouyin] 请求URL: ${apiUrl}`);

      const html = await this.fetchPage(apiUrl, {
        'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 15_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/15.0 Mobile/15E148 Safari/604.1',
        'Referer': 'https://www.douyin.com/',
      }, log);
      
      log?.(`[parseDouyin] HTML 长度: ${html.length}`);
      
      const imageUrls: string[] = [];

      // 从 HTML 中提取 _ROUTER_DATA
      const routerDataMatch = html.match(/window\._ROUTER_DATA\s*=\s*(\{.*?\});?</s) ||
                              html.match(/_ROUTER_DATA\s*=\s*(\{.*?\});/s);
      
      if (routerDataMatch) {
        log?.('[parseDouyin] 找到 _ROUTER_DATA');
        try {
          const data = JSON.parse(routerDataMatch[1]);
          
          // 从 loaderData 中提取图片
          const loaderData = data?.loaderData;
          if (loaderData) {
            // 尝试不同的路径
            const pageKey = Object.keys(loaderData).find(k => k.includes('video') || k.includes('note'));
            const pageInfo = pageKey ? loaderData[pageKey] : null;
            const item = pageInfo?.videoInfoRes?.item_list?.[0];
            
            if (item) {
              // 如果是图集，提取图片（只取第一个URL）
              if (item.images && Array.isArray(item.images)) {
                for (const img of item.images) {
                  if (img.url_list && img.url_list.length > 0) {
                    // 只取第一个URL，避免重复尺寸变体
                    imageUrls.push(img.url_list[0]);
                  }
                }
                log?.(`[parseDouyin] 从 images 提取到 ${imageUrls.length} 张图片`);
              }
              
              // 提取封面图
              const coverUrl = item.video?.cover?.url_list?.[0];
              if (coverUrl && !imageUrls.includes(coverUrl)) {
                imageUrls.push(coverUrl);
                log?.('[parseDouyin] 提取到封面图');
              }
            }
          }
          
          // 递归提取所有图片URL（只取每张图片的第一个URL）
          const extractImages = (obj: any, depth: number = 0): void => {
            if (!obj || typeof obj !== 'object' || depth > 10) return;
            
            if (obj.images && Array.isArray(obj.images)) {
              for (const img of obj.images) {
                if (img.url_list && img.url_list.length > 0) {
                  // 只取第一个URL
                  imageUrls.push(img.url_list[0]);
                } else if (img.url) {
                  imageUrls.push(img.url);
                }
              }
            }
            
            for (const key of Object.keys(obj)) {
              extractImages(obj[key], depth + 1);
            }
          };
          
          if (imageUrls.length === 0) {
            extractImages(data);
            log?.(`[parseDouyin] 递归提取到 ${imageUrls.length} 张图片`);
          }
        } catch (e) {
          log?.(`[parseDouyin] JSON 解析失败: ${e}`);
        }
      } else {
        log?.('[parseDouyin] 未找到 _ROUTER_DATA');
        log?.(`[parseDouyin] HTML 前1000字符: ${html.substring(0, 1000)}`);
      }

      log?.(`[parseDouyin] 最终找到 ${imageUrls.length} 张图片`);
      
      // 基于图片唯一标识去重（提取URL中的图片ID）
      const uniqueImages = new Map<string, string>();
      for (const url of imageUrls) {
        // 从URL中提取图片唯一标识
        const match = url.match(/\/([a-f0-9]{32})~/);
        if (match) {
          const imageId = match[1];
          if (!uniqueImages.has(imageId)) {
            uniqueImages.set(imageId, url);
          }
        } else {
          // 如果无法提取ID，使用完整URL作为key
          if (!uniqueImages.has(url)) {
            uniqueImages.set(url, url);
          }
        }
      }
      
      const result = Array.from(uniqueImages.values());
      log?.(`[parseDouyin] 去重后 ${result.length} 张图片`);
      return result;
    } catch (error) {
      log?.(`[parseDouyin] 解析失败: ${error}`);
      throw error;
    }
  }

  static async parseWeibo(url: string, log?: LogCallback): Promise<string[]> {
    log?.('[parseWeibo] 开始解析微博');
    
    try {
      const html = await this.fetchPage(url, {
        'Referer': 'https://weibo.com/',
      }, log);
      
      const $ = cheerio.load(html);
      const imageUrls: string[] = [];

      $('img').each((_, el) => {
        const src = $(el).attr('src') || $(el).attr('data-src');
        if (src && !src.startsWith('data:') && 
            (src.includes('sinaimg.cn') || src.includes('weibocdn.com'))) {
          const normalizedUrl = src.startsWith('//') ? 'https:' + src : src;
          imageUrls.push(normalizedUrl);
          log?.(`[parseWeibo] 找到图片: ${normalizedUrl}`);
        }
      });

      log?.(`[parseWeibo] 最终找到 ${imageUrls.length} 张图片`);
      return [...new Set(imageUrls)];
    } catch (error) {
      log?.(`[parseWeibo] 解析失败: ${error}`);
      throw error;
    }
  }

  static extractUrlFromText(text: string): string {
    const urlPattern = /https?:\/\/[^\s<>"{}|\\^`\[\]]+/g;
    const matches = text.match(urlPattern);
    if (matches && matches.length > 0) {
      return matches[0];
    }
    return text.trim();
  }

  static async extractFromUrl(input: string, log?: LogCallback): Promise<ExtractTask> {
    const url = this.extractUrlFromText(input);
    const platform = this.detectPlatform(url);
    const logs: string[] = [];
    const collectLog = (msg: string) => {
      logs.push(msg);
      log?.(msg);
    };
    
    collectLog(`[extractFromUrl] 输入内容: ${input}`);
    collectLog(`[extractFromUrl] 提取URL: ${url}`);
    collectLog(`[extractFromUrl] 检测平台: ${platform}`);
    
    const task: ExtractTask = {
      id: nanoid(),
      url,
      platform,
      status: 'pending',
      images: [],
      logs,
    };

    try {
      task.status = 'parsing';
      let imageUrls: string[] = [];

      switch (platform) {
        case 'wechat':
          imageUrls = await this.parseWechat(url, collectLog);
          break;
        case 'xiaohongshu':
          imageUrls = await this.parseXiaohongshu(url, collectLog);
          break;
        case 'douyin':
          imageUrls = await this.parseDouyin(url, collectLog);
          break;
        case 'weibo':
          imageUrls = await this.parseWeibo(url, collectLog);
          break;
        default:
          throw new Error('暂不支持该平台链接');
      }

      task.images = imageUrls
        .filter(imgUrl => this.isValidImageUrl(imgUrl))
        .map((imageUrl, index) => ({
          id: nanoid(),
          url: imageUrl,
          originalUrl: imageUrl,
          filename: this.generateFilename(index, imageUrl, platform),
          platform,
          downloaded: false,
        }));

      task.status = 'completed';
      collectLog(`[extractFromUrl] 解析完成，共 ${task.images.length} 张图片`);
    } catch (error) {
      task.status = 'failed';
      task.error = error instanceof Error ? error.message : '解析失败';
      collectLog(`[extractFromUrl] 解析失败: ${task.error}`);
    }

    return task;
  }

  static isValidImageUrl(url: string): boolean {
    try {
      if (url.startsWith('data:')) return false;
      if (url.includes('avatar') || url.includes('icon') || url.includes('logo')) return false;
      
      const parsedUrl = new URL(url);
      const pathname = parsedUrl.pathname.toLowerCase();
      const hostname = parsedUrl.hostname.toLowerCase();
      const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp'];
      
      if (imageExtensions.some(ext => pathname.endsWith(ext))) {
        return true;
      }
      
      const imageHostKeywords = ['mmbiz', 'xhscdn', 'sinaimg', 'byteimg', 'pstatp', 'douyinpic'];
      if (imageHostKeywords.some(keyword => hostname.includes(keyword))) {
        return true;
      }
      
      if (pathname.includes('/spectrum/')) {
        return true;
      }

      return false;
    } catch {
      return false;
    }
  }

  static generateFilename(index: number, url: string, platform: string): string {
    const ext = this.getExtensionFromUrl(url);
    const timestamp = Date.now();
    return `${platform}_${timestamp}_${index + 1}${ext}`;
  }

  static getExtensionFromUrl(url: string): string {
    try {
      const pathname = new URL(url).pathname.toLowerCase();
      const extensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp'];
      
      for (const ext of extensions) {
        if (pathname.endsWith(ext)) {
          return ext;
        }
      }
      
      if (pathname.includes('_jpg') || pathname.includes('mmbiz_jpg')) return '.jpg';
      if (pathname.includes('_png') || pathname.includes('mmbiz_png')) return '.png';
      if (pathname.includes('_gif') || pathname.includes('mmbiz_gif')) return '.gif';
      if (pathname.includes('_webp') || pathname.includes('mmbiz_webp')) return '.webp';
      
      return '.jpg';
    } catch {
      return '.jpg';
    }
  }

  static async downloadImage(url: string, savePath: string, filename: string, log?: LogCallback): Promise<string> {
    const filePath = path.join(savePath, filename);
    log?.(`[downloadImage] 下载: ${url}`);
    
    const buffer = await this.fetchImageAsBuffer(url, log);
    await fs.ensureDir(savePath);
    await fs.writeFile(filePath, buffer);
    log?.(`[downloadImage] 保存成功: ${filePath}`);
    return filePath;
  }

  static async downloadImages(
    images: ExtractedImage[],
    savePath: string,
    onProgress?: (progress: { current: number; total: number; image: ExtractedImage }) => void,
    log?: LogCallback
  ): Promise<ExtractedImage[]> {
    const results: ExtractedImage[] = [];
    log?.(`[downloadImages] 开始下载 ${images.length} 张图片到 ${savePath}`);

    for (let i = 0; i < images.length; i++) {
      const image = images[i];
      try {
        const localPath = await this.downloadImage(image.url, savePath, image.filename, log);
        results.push({
          ...image,
          downloaded: true,
          localPath,
        });
      } catch (error) {
        results.push({
          ...image,
          downloaded: false,
          error: error instanceof Error ? error.message : '下载失败',
        });
      }

      if (onProgress) {
        onProgress({
          current: i + 1,
          total: images.length,
          image: results[results.length - 1],
        });
      }
    }

    log?.(`[downloadImages] 下载完成`);
    return results;
  }

  static async fetchImageAsBuffer(url: string, log?: LogCallback): Promise<Buffer> {
    log?.(`[fetchImageAsBuffer] 获取图片: ${url}`);
    
    return new Promise((resolve, reject) => {
      const urlObj = new URL(url);
      const requestModule = urlObj.protocol === 'https:' ? https : http;
      
      const headers: Record<string, string> = {
        'User-Agent': DEFAULT_HEADERS['User-Agent'],
        'Accept': 'image/webp,image/*,*/*;q=0.8',
      };
      
      try {
        const hostname = urlObj.hostname;
        
        if (hostname.includes('douyinpic') || hostname.includes('pstatp') || hostname.includes('byteimg')) {
          headers['Referer'] = 'https://www.douyin.com/';
        } else if (hostname.includes('mmbiz')) {
          headers['Referer'] = 'https://mp.weixin.qq.com/';
        } else if (hostname.includes('sinaimg')) {
          headers['Referer'] = 'https://weibo.com/';
        } else if (!hostname.includes('xhscdn')) {
          headers['Referer'] = urlObj.origin + '/';
        }
      } catch {
        // ignore
      }

      let timer: ReturnType<typeof setTimeout>;
      
      const request = requestModule.get(url, { headers }, (response) => {
        log?.(`[fetchImageAsBuffer] 响应状态: ${response.statusCode}`);
        
        if (response.statusCode === 301 || response.statusCode === 302 || 
            response.statusCode === 303 || response.statusCode === 307 || response.statusCode === 308) {
          const location = response.headers.location;
          if (location) {
            clearTimeout(timer);
            const redirectUrl = location.startsWith('http') ? location : new URL(location, url).href;
            this.fetchImageAsBuffer(redirectUrl, log).then(resolve).catch(reject);
            return;
          }
        }
        
        const chunks: Buffer[] = [];
        
        response.on('data', (chunk: Buffer) => {
          chunks.push(chunk);
        });

        response.on('end', () => {
          clearTimeout(timer);
          if (response.statusCode === 200) {
            const buffer = Buffer.concat(chunks);
            log?.(`[fetchImageAsBuffer] 获取成功，大小: ${buffer.length}`);
            resolve(buffer);
          } else {
            reject(new Error(`HTTP ${response.statusCode}`));
          }
        });
      });

      timer = setTimeout(() => {
        request.destroy(new Error('请求超时(15s)'));
      }, 15000);

      request.on('error', (error) => {
        clearTimeout(timer);
        log?.(`[fetchImageAsBuffer] 获取失败: ${error.message}`);
        reject(error);
      });
    });
  }
}
