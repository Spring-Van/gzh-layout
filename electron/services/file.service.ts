import { dialog } from 'electron';
import fs from 'fs-extra';
import path from 'path';
import crypto from 'crypto';
import { Buffer } from 'node:buffer';
import sharp from 'sharp';

export class FileService {
    static async selectFolder(): Promise<string | null> {
        const result = await dialog.showOpenDialog({
            properties: ['openDirectory'],
        });

        if (result.canceled || result.filePaths.length === 0) {
            return null;
        }

        return result.filePaths[0];
    }

    static async backupFolder(sourcePath: string): Promise<string> {
        const folderName = path.basename(sourcePath);
        const backupPath = path.join(path.dirname(sourcePath), `${folderName}-备份`);
        
        // 如果备份文件夹已存在，先清空
        if (await fs.pathExists(backupPath)) {
            await fs.remove(backupPath);
        }
        
        await fs.copy(sourcePath, backupPath);
        return backupPath;
    }

    static async calculateMD5(filePath: string): Promise<string> {
        return new Promise((resolve, reject) => {
            const hash = crypto.createHash('md5');
            const stream = fs.createReadStream(filePath);

            stream.on('error', reject);
            stream.on('data', (chunk) => hash.update(chunk));
            stream.on('end', () => resolve(hash.digest('hex')));
        });
    }

    static async splitIntoFolders(
        sourcePath: string,
        images: Array<{ path: string; name: string }>,
        splitCount: number,
        folderDate: string
    ): Promise<string[]> {
        const folderName = path.basename(sourcePath);
        const backupPath = path.join(path.dirname(sourcePath), `${folderName}-备份`);
        
        // 如果备份文件夹已存在，先清空
        if (await fs.pathExists(backupPath)) {
            await fs.remove(backupPath);
        }
        
        await fs.ensureDir(backupPath);

        const createdFolders: string[] = [];

        const groups: Array<Array<{ path: string; name: string }>> = [];
        for (let i = 0; i < images.length; i += splitCount) {
            groups.push(images.slice(i, i + splitCount));
        }

        for (let i = 0; i < groups.length; i++) {
            const groupIndex = i + 1;
            const groupFolderName = `${folderDate} - 第${groupIndex}组`;

            const groupFolderPath = path.join(backupPath, groupFolderName);
            await fs.ensureDir(groupFolderPath);
            createdFolders.push(groupFolderPath);

            for (const image of groups[i]) {
                const destPath = path.join(groupFolderPath, image.name);
                await fs.copy(image.path, destPath);
            }
        }

        return createdFolders;
    }

    static async saveBase64Image(base64Data: string, filename: string): Promise<string> {
        const tempDir = path.join(process.env.APPDATA || process.env.HOME || '', 'gzh-layout', 'temp');
        await fs.ensureDir(tempDir);

        const filePath = path.join(tempDir, filename);

        const matches = base64Data.match(/^data:image\/(png|jpeg|jpg);base64,(.*)$/);
        if (!matches || matches.length !== 3) {
            throw new Error('无效的 base64 图片格式');
        }

        const imageBuffer = Buffer.from(matches[2], 'base64');
        await fs.writeFile(filePath, imageBuffer);

        return filePath;
    }

    static async createCoverFolder(basePath: string): Promise<string> {
        const coverFolder = path.join(basePath, '封面');
        await fs.ensureDir(coverFolder);
        return coverFolder;
    }

    /**
     * 清洗字符串为合法文件夹名（去除 Windows/macOS 非法字符）
     * - 替换 \ / : * ? " < > | 为 _
     * - 去除首尾空格和点（Windows 不允许）
     * - 截断到 80 字符，避免过长
     */
    static sanitizeFolderName(name: string): string {
        const cleaned = (name || '')
            .replace(/[\\/:*?"<>|]/g, '_')
            .replace(/\s+/g, ' ')
            .trim()
            .replace(/^\.+|\.+$/g, '');
        const fallback = '未命名文章';
        return cleaned.slice(0, 80) || fallback;
    }

    /**
     * 把分组文件夹重命名为文章标题。
     * 用于：同步完成单篇文章后，把 savePath/分组N 改为 savePath/{文章标题}。
     *
     * @param oldFolderPath 旧文件夹绝对路径
     * @param newFolderName 期望的新文件夹名（会被自动 sanitize）
     * @returns 新文件夹绝对路径；若旧路径不存在则返回空串
     */
    static async renameFolderToTitle(
        oldFolderPath: string,
        newFolderName: string
    ): Promise<string> {
        // 旧路径不存在直接返回空，避免误删
        if (!(await fs.pathExists(oldFolderPath))) {
            return '';
        }

        const parentDir = path.dirname(oldFolderPath);
        const sanitized = this.sanitizeFolderName(newFolderName);
        let targetPath = path.join(parentDir, sanitized);

        // 目标已存在则追加序号：标题 / 标题_2 / 标题_3 ...
        if (targetPath !== oldFolderPath && (await fs.pathExists(targetPath))) {
            let seq = 2;
            while (await fs.pathExists(path.join(parentDir, `${sanitized}_${seq}`))) {
                seq++;
            }
            targetPath = path.join(parentDir, `${sanitized}_${seq}`);
        }

        // 旧路径与新路径相同，无需重命名
        if (targetPath === oldFolderPath) {
            return oldFolderPath;
        }

        await fs.rename(oldFolderPath, targetPath);
        return targetPath;
    }

    static async saveCoverImage(coverFolder: string, base64Data: string, filename: string): Promise<string> {
        await fs.ensureDir(coverFolder);

        const filePath = path.join(coverFolder, filename);

        const matches = base64Data.match(/^data:image\/(png|jpeg|jpg);base64,(.*)$/);
        if (!matches || matches.length !== 3) {
            throw new Error('无效的 base64 图片格式');
        }

        const imageBuffer = Buffer.from(matches[2], 'base64');
        await fs.writeFile(filePath, imageBuffer);

        return filePath;
    }

    static async deleteCoverFolder(coverFolder: string): Promise<void> {
        if (await fs.pathExists(coverFolder)) {
            await fs.remove(coverFolder);
        }
    }

    static async deleteCoverImage(filePath: string): Promise<void> {
        if (await fs.pathExists(filePath)) {
            await fs.remove(filePath);
        }
    }

    /**
     * 将 WebP 图片转换为 PNG 格式
     * 备份模式: 保存到 {原文件夹名-备份}/webp-converted
     * 非备份模式: 保存到 {原文件夹名}/webp-converted
     */
    static async convertWebpImages(
        sourcePath: string,
        webpImages: Array<{ path: string; name: string }>,
        backupEnabled: boolean
    ): Promise<Record<string, string>> {
        const folderName = path.basename(sourcePath);
        const parentDir = path.dirname(sourcePath);

        // 根据是否备份决定输出目录
        const baseDir = backupEnabled
            ? path.join(parentDir, `${folderName}-备份`)
            : sourcePath;
        const outputDir = path.join(baseDir, 'webp-converted');

        await fs.ensureDir(outputDir);

        const convertedMap: Record<string, string> = {};

        for (const image of webpImages) {
            const outputName = path.parse(image.name).name + '.png';
            const outputPath = path.join(outputDir, outputName);

            await sharp(image.path)
                .png()
                .toFile(outputPath);

            // 原路径 -> 转换后路径
            convertedMap[image.path] = outputPath;
        }

        return convertedMap;
    }
}
