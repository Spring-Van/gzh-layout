import { dialog } from 'electron';
import fs from 'fs-extra';
import path from 'path';
import crypto from 'crypto';
import { Buffer } from 'node:buffer';

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
}
