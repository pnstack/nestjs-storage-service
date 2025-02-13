import { existsSync, mkdirSync } from 'fs';
import { diskStorage, memoryStorage } from 'multer';
import { extname } from 'path';

export const disk = diskStorage({
  destination: (req: any, file: any, cb: any) => {
    const uploadPath = `./uploads`;
    if (!existsSync(uploadPath)) {
      mkdirSync(uploadPath);
    }
    cb(null, uploadPath);
  },
  filename: (req: any, file: any, cb: any) => {
    // Random name with 32 characters
    const randomName = Array(32)
      .fill(null)
      .map(() => Math.round(Math.random() * 16).toString(16))
      .join('');
    cb(null, `${randomName}${extname(file.originalname)}`);
  },
});

export const storageClass = {
  disk,
};
