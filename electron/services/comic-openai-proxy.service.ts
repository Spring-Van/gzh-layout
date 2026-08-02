/**
 * Comic OpenAI 代理服务
 * 替代原 server/openaiProxy.ts（Express），改为 Electron 主进程直接转发
 * 解决前端跨域问题，支持 JSON 和 multipart/form-data 两种请求体
 */

import axios from 'axios';
import FormData from 'form-data';

/** 代理请求中的文件参数 */
export interface ProxyFile {
  field: string;
  filename: string;
  /** base64 编码（不含 data URL 前缀） */
  base64: string;
  mimetype: string;
}

/** 代理请求参数 */
export interface ComicProxyRequest {
  method: string;
  /** 目标完整 URL（已拼接好 baseUrl + path） */
  targetUrl: string;
  /** 转发请求头 */
  headers: Record<string, string>;
  /** JSON 请求体（method=POST 且非 multipart 时使用） */
  body?: string;
  /** multipart/form-data 请求体（有文件上传时使用） */
  formData?: {
    fields: Record<string, string>;
    files: ProxyFile[];
  };
}

/** 代理响应 */
export interface ComicProxyResponse {
  status: number;
  /** 响应体（对象或字符串） */
  data: unknown;
  /** 错误信息 */
  error?: string;
}

export class ComicOpenaiProxyService {
  /**
   * 转发请求到目标 OpenAI 兼容服务
   * 支持两种模式：
   * 1. JSON body：直接转发
   * 2. multipart/form-data：重建 FormData（含文件）后转发
   */
  async proxy(request: ComicProxyRequest): Promise<ComicProxyResponse> {
    const { method, targetUrl, headers, body, formData } = request;

    if (!targetUrl) {
      return { status: 400, data: null, error: '缺少目标 URL' };
    }

    try {
      let response;

      if (formData) {
        // multipart/form-data 模式
        const form = new FormData();

        // 添加文本字段
        for (const [key, value] of Object.entries(formData.fields)) {
          form.append(key, value);
        }

        // 添加文件字段
        for (const file of formData.files) {
          const buffer = Buffer.from(file.base64, 'base64');
          form.append(file.field, buffer, {
            filename: file.filename,
            contentType: file.mimetype,
          });
        }

        // 合并请求头（保留 Authorization 等业务头）
        const forwardHeaders: Record<string, string> = {
          ...form.getHeaders(),
        };
        if (headers['Authorization']) {
          forwardHeaders['Authorization'] = headers['Authorization'];
        }

        response = await axios.post(targetUrl, form, {
          headers: forwardHeaders,
          maxBodyLength: Infinity,
          maxContentLength: Infinity,
          validateStatus: () => true,
        });
      } else {
        // JSON 或无 body 模式
        const forwardHeaders: Record<string, string> = { ...headers };
        if (body) {
          forwardHeaders['Content-Type'] = 'application/json';
        }

        response = await axios({
          method: method.toLowerCase() as any,
          url: targetUrl,
          data: body || undefined,
          headers: forwardHeaders,
          maxBodyLength: Infinity,
          maxContentLength: Infinity,
          validateStatus: () => true,
        });
      }

      return {
        status: response.status,
        data: response.data,
      };
    } catch (error: any) {
      console.error('OpenAI 代理请求失败:', error.message);
      return {
        status: 500,
        data: null,
        error: error.message || '代理请求失败',
      };
    }
  }
}

export const comicOpenaiProxyService = new ComicOpenaiProxyService();
