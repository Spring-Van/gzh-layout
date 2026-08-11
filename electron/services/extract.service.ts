import fs from 'fs-extra';
import path from 'path';
import http from 'http';
import https from 'https';
import type { ClientRequest, IncomingMessage, RequestOptions } from 'http';
import { net } from 'electron';
import { nanoid } from 'nanoid';
import * as cheerio from 'cheerio';
import sharp from 'sharp';
import type {
  ExtractedImage,
  ExtractPlatform as Platform,
  ExtractTask,
  ImageFilterOptions,
} from '../../src/features/extract/types';

function getByProtocol(
  url: string,
  options: RequestOptions,
  callback: (response: IncomingMessage) => void,
): ClientRequest {
  return url.startsWith('https:')
    ? https.get(url, options, callback)
    : http.get(url, options, callback);
}

function requestByProtocol(
  url: string,
  options: RequestOptions,
  callback: (response: IncomingMessage) => void,
): ClientRequest {
  return url.startsWith('https:')
    ? https.request(url, options, callback)
    : http.request(url, options, callback);
}

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

      const request = getByProtocol(url, {
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

      // 优化图片URL：替换为高清原图
      const upgradeWechatImageUrl = (rawUrl: string): string => {
        let upgraded = rawUrl;
        // 1. 将路径中的 /640、/300 等宽度参数替换为 /0（代表原图）
        //    例如：https://mmbiz.qpic.cn/mmbiz_jpg/abc/640?wx_fmt=jpeg -> /0
        upgraded = upgraded.replace(/\/(\d{2,4})(\?|$)/, '/0$2');
        // 2. 强制使用原始格式（去掉 wx_fmt、tp 等格式转换参数，避免被转码压缩）
        try {
          const urlObj = new URL(upgraded);
          // 删除 webp 强制转换
          urlObj.searchParams.delete('tp');
          urlObj.searchParams.delete('tp_type');
          // 保留 wx_fmt（原始格式标识），确保返回原格式
          upgraded = urlObj.toString();
        } catch {
          // ignore
        }
        log?.(`[parseWechat] URL升级: ${rawUrl} -> ${upgraded}`);
        return upgraded;
      };

      jsContentImages.each((i, el) => {
        const src = $(el).attr('data-src') || $(el).attr('src');
        log?.(`[parseWechat] 图片 ${i}: src=${src}`);

        if (src && !src.startsWith('data:')) {
          const normalizedUrl = src.startsWith('//') ? 'https:' + src : src;
          imageUrls.add(upgradeWechatImageUrl(normalizedUrl));
        }
      });

      // 如果没有找到，尝试查找所有 mmbiz.qpic.cn 的图片
      if (imageUrls.size === 0) {
        log?.('[parseWechat] #js_content 未找到图片，尝试查找所有 mmbiz 图片');

        $('img').each((_, el) => {
          const src = $(el).attr('data-src') || $(el).attr('src');
          if (src && !src.startsWith('data:') && src.includes('mmbiz.qpic.cn')) {
            const normalizedUrl = src.startsWith('//') ? 'https:' + src : src;
            imageUrls.add(upgradeWechatImageUrl(normalizedUrl));
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

                // 优化小红书图片URL：去掉 imageView2 等压缩参数，获取原图
                const upgradeXhsImageUrl = (rawUrl: string): string => {
                  try {
                    const urlObj = new URL(rawUrl);
                    // 去掉 ?imageView2/2/w/1080/format/jpg 等压缩参数
                    const paramsToRemove = [
                      'imageView2',
                      'imageView',
                      'xhsS3',
                    ];
                    for (const key of Array.from(urlObj.searchParams.keys())) {
                      if (paramsToRemove.some(p => key.toLowerCase().includes(p.toLowerCase()))) {
                        urlObj.searchParams.delete(key);
                      }
                    }
                    // 把 path 中的 imageView2 等压缩指令也去掉（部分链接写在 path 里）
                    let pathname = urlObj.pathname;
                    pathname = pathname.replace(/\/imageView2[\w\/\.\-]*/g, '/');
                    urlObj.pathname = pathname;
                    return urlObj.toString();
                  } catch {
                    return rawUrl;
                  }
                };

                // 从 imageList 中按优先级取高清原图
                const pickXhsBestUrl = (img: any): string => {
                  // 1. 优先取 url（小红书原始字段，原图）
                  if (img.url) {
                    return upgradeXhsImageUrl(img.url);
                  }
                  // 2. 取 urlPre
                  if (img.urlPre) {
                    return upgradeXhsImageUrl(img.urlPre);
                  }
                  // 3. 最后回退到 urlDefault（默认压缩图）
                  if (img.urlDefault) {
                    return upgradeXhsImageUrl(img.urlDefault);
                  }
                  // 4. 尝试 infoList 中的场景化URL
                  if (Array.isArray(img.infoList) && img.infoList.length > 0) {
                    // 优先找 WB_DFT（默认场景，对应原图），再退而求其次 WB_PRV
                    const dft = img.infoList.find((it: any) => it.imageScene === 'WB_DFT');
                    const prv = img.infoList.find((it: any) => it.imageScene === 'WB_PRV');
                    if (dft?.url) return upgradeXhsImageUrl(dft.url);
                    if (prv?.url) return upgradeXhsImageUrl(prv.url);
                    if (img.infoList[0]?.url) return upgradeXhsImageUrl(img.infoList[0].url);
                  }
                  return '';
                };

                for (const img of noteData.imageList) {
                  const imgUrl = pickXhsBestUrl(img);
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

          // 抖音 url_list 通常按尺寸从小到大排列（带水印的预览 -> 无水印高清原图）
          // 取最后一个即可获得无水印高清原图
          const pickDouyinBestUrl = (urlList: any): string => {
            if (!Array.isArray(urlList) || urlList.length === 0) return '';
            // 优先取最后一个（最大尺寸、无水印的原图）
            return urlList[urlList.length - 1];
          };

          // 从 loaderData 中提取图片
          const loaderData = data?.loaderData;
          if (loaderData) {
            // 尝试不同的路径
            const pageKey = Object.keys(loaderData).find(k => k.includes('video') || k.includes('note'));
            const pageInfo = pageKey ? loaderData[pageKey] : null;
            const item = pageInfo?.videoInfoRes?.item_list?.[0];

            if (item) {
              // 如果是图集，提取图片（取每张图的最大尺寸URL）
              if (item.images && Array.isArray(item.images)) {
                for (const img of item.images) {
                  const bestUrl = pickDouyinBestUrl(img.url_list);
                  if (bestUrl) {
                    imageUrls.push(bestUrl);
                  }
                }
                log?.(`[parseDouyin] 从 images 提取到 ${imageUrls.length} 张图片`);
              }

              // 提取封面图（取最大尺寸）
              const coverUrl = pickDouyinBestUrl(item.video?.cover?.url_list);
              if (coverUrl && !imageUrls.includes(coverUrl)) {
                imageUrls.push(coverUrl);
                log?.('[parseDouyin] 提取到封面图');
              }
            }
          }

          // 递归提取所有图片URL（每张图都取最大尺寸URL）
          const extractImages = (obj: any, depth: number = 0): void => {
            if (!obj || typeof obj !== 'object' || depth > 10) return;

            if (obj.images && Array.isArray(obj.images)) {
              for (const img of obj.images) {
                const bestUrl = pickDouyinBestUrl(img.url_list);
                if (bestUrl) {
                  imageUrls.push(bestUrl);
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

      // 优化微博图片URL：把小尺寸的预览图（orj360/mw690等）替换为 large（原图尺寸）
      // 微博URL结构：https://wxN.sinaimg.cn/{尺寸}/...jpg
      // 尺寸关键词：thumbnail(150), orj360(360), square, small, bmiddle(480), mw690(690), orj960(960), large(1080), original(原图)
      const upgradeWeiboImageUrl = (rawUrl: string): string => {
        let upgraded = rawUrl;
        // 把各种缩略图尺寸统一替换为 large（1080p 大图）
        upgraded = upgraded.replace(
          /\/(orj360|orj240|orj480|mw690|thumbnail|small|bmiddle|square|orj960)\//i,
          '/large/'
        );
        log?.(`[parseWeibo] URL升级: ${rawUrl} -> ${upgraded}`);
        return upgraded;
      };

      $('img').each((_, el) => {
        const src = $(el).attr('src') || $(el).attr('data-src');
        if (src && !src.startsWith('data:') &&
          (src.includes('sinaimg.cn') || src.includes('weibocdn.com'))) {
          const normalizedUrl = src.startsWith('//') ? 'https:' + src : src;
          imageUrls.push(upgradeWeiboImageUrl(normalizedUrl));
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

      // 解析完成后，并发获取每张图的文件大小（HEAD 优先，失败时 GET 兜底），
      // 这样前端可以展示每张图大小，用户输入过滤阈值时心里有数
      if (task.images.length > 0) {
        collectLog(`[extractFromUrl] 开始获取 ${task.images.length} 张图片的元信息...`);
        const enriched = await this.enrichImagesWithSize(task.images, collectLog);
        const gotSizeCount = enriched.filter(img => (img.fileSize ?? 0) > 0).length;
        collectLog(`[extractFromUrl] 元信息获取完成: ${gotSizeCount}/${enriched.length} 张拿到大小`);
        task.images = enriched;
      }

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
      const parsedUrl = new URL(url);
      const pathname = parsedUrl.pathname.toLowerCase();

      // 1. 优先从 URL 参数 wx_fmt 中推断微信图片格式
      const wxFmt = parsedUrl.searchParams.get('wx_fmt')?.toLowerCase();
      if (wxFmt) {
        if (wxFmt.includes('jpeg') || wxFmt.includes('jpg')) return '.jpg';
        if (wxFmt.includes('png')) return '.png';
        if (wxFmt.includes('gif')) return '.gif';
        if (wxFmt.includes('webp')) return '.webp';
      }

      // 2. 从 pathname 中的 mmbiz_xxx 推断微信格式
      if (pathname.includes('mmbiz_jpg') || pathname.includes('_jpg')) return '.jpg';
      if (pathname.includes('mmbiz_png') || pathname.includes('_png')) return '.png';
      if (pathname.includes('mmbiz_gif') || pathname.includes('_gif')) return '.gif';
      if (pathname.includes('mmbiz_webp') || pathname.includes('_webp')) return '.webp';

      // 3. 标准扩展名匹配
      const extensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp'];
      for (const ext of extensions) {
        if (pathname.endsWith(ext)) {
          return ext;
        }
      }

      // 4. 抖音 byteimg 域名默认 webp
      if (pathname.includes('image-view') || pathname.includes('~tplv-')) {
        // 抖音CDN处理后的路径没有扩展名，默认为 jpeg
        return '.jpg';
      }

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

  /**
   * 用 HEAD 请求探测图片文件大小（不下载完整内容）
   * 失败时返回 0
   */
  static async fetchImageContentLength(url: string, log?: LogCallback): Promise<number> {
    return new Promise((resolve) => {
      const urlObj = new URL(url);

      const headers: Record<string, string> = {
        'User-Agent': DEFAULT_HEADERS['User-Agent'],
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

      const request = requestByProtocol(url, { method: 'HEAD', headers, timeout: 8000 }, (response) => {
        // 部分服务器对 HEAD 不支持，自动重定向到 GET
        if (response.statusCode === 405 || response.statusCode === 403) {
          resolve(0);
          return;
        }
        if (response.statusCode && response.statusCode >= 300 && response.statusCode < 400) {
          const location = response.headers.location;
          if (location) {
            const redirectUrl = location.startsWith('http') ? location : new URL(location, url).href;
            this.fetchImageContentLength(redirectUrl, log).then(resolve).catch(() => resolve(0));
            return;
          }
        }
        const len = parseInt(response.headers['content-length'] || '0', 10);
        response.resume();
        resolve(len > 0 ? len : 0);
      });

      request.on('error', () => resolve(0));
      request.on('timeout', () => {
        request.destroy();
        resolve(0);
      });
      request.end();
    });
  }

  /**
   * 并发获取一组图片的文件大小（HEAD 优先，失败时 GET 拿 buffer 长度兜底）。
   * 用于解析阶段就让前端能看到每张图的实际大小，便于用户设置过滤阈值。
   * 并发数限制为 6，避免被 CDN 限流。
   */
  static async enrichImagesWithSize(
    images: ExtractedImage[],
    log?: LogCallback
  ): Promise<ExtractedImage[]> {
    const CONCURRENCY = 6;
    const result: ExtractedImage[] = [...images];

    let cursor = 0;
    const worker = async () => {
      while (cursor < result.length) {
        const idx = cursor++;
        const img = result[idx];
        let size = await this.fetchImageContentLength(img.url, log);
        // HEAD 失败/不支持时，回退到 GET 拿 buffer 真实长度
        if (size <= 0) {
          try {
            const buffer = await this.fetchImageAsBuffer(img.url, log);
            size = buffer.length;
          } catch {
            size = 0;
          }
        }
        result[idx] = { ...img, fileSize: size };
      }
    };

    await Promise.all(Array.from({ length: Math.min(CONCURRENCY, result.length) }, worker));
    return result;
  }

  /**
   * 用 sharp 解析 Buffer 的图片尺寸（不写盘）
   * 失败时返回 null
   */
  static async probeImageSize(buffer: Buffer, log?: LogCallback): Promise<{ width: number; height: number } | null> {
    try {
      const metadata = await sharp(buffer).metadata();
      if (metadata.width && metadata.height) {
        return { width: metadata.width, height: metadata.height };
      }
      return null;
    } catch (error) {
      log?.(`[probeImageSize] sharp 解析失败: ${(error as Error).message}`);
      return null;
    }
  }

  /**
   * 带过滤条件的图片下载
   * 流程：
   * 1. 对每张图先用已知的 fileSize 过滤（解析阶段已经获取）；fileSize 未知或 0 的进入下载流程
   * 2. 进入下载流程的图，先用 HEAD 请求预检文件大小（拿到且<阈值则跳过，节省流量）
   * 3. HEAD 没拿到时下载 buffer，用 buffer.length 二次校验
   * 4. 用 sharp 解析 Buffer 尺寸，过滤掉比 minWidth/minHeight 小的（如果启用）
   * 5. 满足条件的图片才落盘
   *
   * 返回的结果中，被过滤的会带 `filtered: true` 和 `filterReason`；
   * 下载失败的会带 `downloaded: false` 和 `error`。
   */
  static async filterAndDownloadImages(
    images: ExtractedImage[],
    savePath: string,
    filterOptions: ImageFilterOptions,
    onProgress?: (progress: { current: number; total: number; image: ExtractedImage }) => void,
    log?: LogCallback
  ): Promise<ExtractedImage[]> {
    const results: ExtractedImage[] = [];
    const total = images.length;
    const { enabled, minWidth = 0, minHeight = 0, minSizeKB = 0 } = filterOptions;
    const minSizeBytes = minSizeKB * 1024;
    const needSizeCheck = enabled && minSizeBytes > 0;
    const needDimCheck = enabled && (minWidth > 0 || minHeight > 0);

    log?.(`[filterAndDownloadImages] 开始 ${total} 张 -> 保存到 ${savePath}, 过滤规则: ${JSON.stringify(filterOptions)}`);

    if (!enabled) {
      // 未启用过滤，走原有下载流程
      return this.downloadImages(images, savePath, onProgress, log);
    }

    await fs.ensureDir(savePath);

    for (let i = 0; i < total; i++) {
      const image = images[i];

      try {
        // 1) 优先用解析阶段已拿到的 fileSize 过滤
        //    解析时 enrichImagesWithSize 会并发获取 size 并填到 ExtractedImage.fileSize 上
        if (needSizeCheck && (image.fileSize ?? 0) > 0 && image.fileSize! < minSizeBytes) {
          const skipped: ExtractedImage = {
            ...image,
            filtered: true,
            filterReason: `文件 ${(image.fileSize! / 1024).toFixed(1)}KB < 阈值 ${minSizeKB}KB`,
            fileSize: image.fileSize,
          };
          log?.(`[filterAndDownloadImages] 跳过(${i + 1}/${total}) ${image.filename}: ${skipped.filterReason}`);
          results.push(skipped);
          onProgress?.({ current: i + 1, total, image: skipped });
          continue;
        }

        // 2) 完整下载到 Buffer
        const buffer = await this.fetchImageAsBuffer(image.url, log);

        // 3) 文件大小二次校验（兜底：解析阶段没拿到 size 的图，靠 buffer.length 过滤）
        if (needSizeCheck && buffer.length < minSizeBytes) {
          const skipped: ExtractedImage = {
            ...image,
            filtered: true,
            filterReason: `文件 ${(buffer.length / 1024).toFixed(1)}KB < 阈值 ${minSizeKB}KB`,
            fileSize: buffer.length,
          };
          log?.(`[filterAndDownloadImages] 跳过(${i + 1}/${total}) ${image.filename}: ${skipped.filterReason}`);
          results.push(skipped);
          onProgress?.({ current: i + 1, total, image: skipped });
          continue;
        }

        // 4) 尺寸过滤（如果启用）
        let dim: { width: number; height: number } | null = null;
        if (needDimCheck) {
          dim = await this.probeImageSize(buffer, log);
          if (dim) {
            if (minWidth > 0 && dim.width < minWidth) {
              const skipped: ExtractedImage = {
                ...image,
                filtered: true,
                filterReason: `宽度 ${dim.width}px < 阈值 ${minWidth}px`,
                width: dim.width,
                height: dim.height,
                fileSize: buffer.length,
              };
              log?.(`[filterAndDownloadImages] 跳过(${i + 1}/${total}) ${image.filename}: ${skipped.filterReason}`);
              results.push(skipped);
              onProgress?.({ current: i + 1, total, image: skipped });
              continue;
            }
            if (minHeight > 0 && dim.height < minHeight) {
              const skipped: ExtractedImage = {
                ...image,
                filtered: true,
                filterReason: `高度 ${dim.height}px < 阈值 ${minHeight}px`,
                width: dim.width,
                height: dim.height,
                fileSize: buffer.length,
              };
              log?.(`[filterAndDownloadImages] 跳过(${i + 1}/${total}) ${image.filename}: ${skipped.filterReason}`);
              results.push(skipped);
              onProgress?.({ current: i + 1, total, image: skipped });
              continue;
            }
          }
        }

        // 5) 通过过滤，写入磁盘
        const filePath = path.join(savePath, image.filename);
        await fs.writeFile(filePath, buffer);
        log?.(`[filterAndDownloadImages] 保存成功(${i + 1}/${total}): ${filePath} (${(buffer.length / 1024).toFixed(1)}KB${dim ? `, ${dim.width}x${dim.height}` : ''})`);

        const saved: ExtractedImage = {
          ...image,
          downloaded: true,
          localPath: filePath,
          width: dim?.width,
          height: dim?.height,
          fileSize: buffer.length,
        };
        results.push(saved);
        onProgress?.({ current: i + 1, total, image: saved });
      } catch (error) {
        const failed: ExtractedImage = {
          ...image,
          downloaded: false,
          error: error instanceof Error ? error.message : '下载失败',
        };
        log?.(`[filterAndDownloadImages] 失败(${i + 1}/${total}) ${image.filename}: ${failed.error}`);
        results.push(failed);
        onProgress?.({ current: i + 1, total, image: failed });
      }
    }

    const filteredCount = results.filter((r) => r.filtered).length;
    const successCount = results.filter((r) => r.downloaded).length;
    const failCount = results.filter((r) => !r.downloaded && !r.filtered).length;
    log?.(`[filterAndDownloadImages] 完成: 成功 ${successCount}，过滤 ${filteredCount}，失败 ${failCount} / 总 ${total}`);
    return results;
  }

  static async fetchImageAsBuffer(url: string, log?: LogCallback): Promise<Buffer> {
    log?.(`[fetchImageAsBuffer] 获取图片: ${url}`);

    return new Promise((resolve, reject) => {
      const urlObj = new URL(url);

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

      const request = getByProtocol(url, { headers }, (response) => {
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
