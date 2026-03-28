import { dialog } from 'electron';
import fs from 'fs-extra';
import path from 'path';
import crypto from 'crypto';

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
}
