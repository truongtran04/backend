import { Injectable, Inject, BadRequestException } from '@nestjs/common';
import { SupabaseClient } from '@supabase/supabase-js';
import axios from 'axios';
import * as crypto from 'crypto';

@Injectable()
export class SupabaseService {
    constructor(
        @Inject('SUPABASE_CLIENT') private readonly supabase: SupabaseClient,
    ) { }

    async uploadImage(folder: string, fileName: string, buffer: Buffer, mimeType = 'image/jpeg',): Promise<string> {
        if (!folder || !fileName || !buffer) {
            throw new BadRequestException('Missing required parameters');
        }

        const filePath = `${folder}/${fileName}`;

        const { error } = await this.supabase.storage
            .from('images')
            .upload(filePath, buffer, {
                contentType: mimeType,
                upsert: true,
            });

        if (error) {
            console.error('Supabase upload error:', error);
            throw new BadRequestException('Failed to upload image');
        }

        const { data } = this.supabase.storage.from('images').getPublicUrl(filePath);
        return data.publicUrl;
    }

    async decodeBase64ToBuffer(base64: string): Promise<{ buffer: Buffer; mimeType: string }> {
        if (!base64) throw new BadRequestException('No base64 data provided');
    
        const matches = base64.match(/^data:(.+);base64,(.+)$/);
        let mimeType = 'image/jpeg';
        let base64Data = base64;
    
        if (matches) {
          mimeType = matches[1];
          base64Data = matches[2];
        }
    
        const buffer = Buffer.from(base64Data, 'base64');
        return { buffer, mimeType };
      }


    async normalizeFileName(name: string): Promise<string> {
        const normalized = this.removeAccents(name)
            .toLowerCase()
            .trim()
            .replace(/\s+/g, '_')
            .replace(/[^a-z0-9_]/g, '');
        return normalized;
    }

    private removeAccents(str: string): string {
        return str
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
            .replace(/đ/g, 'd')
            .replace(/Đ/g, 'D');
    }

    async renameImage(oldPath: string, newPath: string): Promise<string> {
        if (!oldPath || !newPath) {
            throw new BadRequestException('Thiếu đường dẫn ảnh để đổi tên');
        }
    
        const { error: copyError } = await this.supabase.storage.from('images').copy(oldPath, newPath);
    
        if (copyError) {
            console.error('Supabase rename error:', copyError);
            throw new BadRequestException('Không thể đổi tên ảnh');
        }
    
        const { error: removeError } = await this.supabase.storage.from('images').remove([oldPath]);
    
        if (removeError) {
            console.warn('Không thể xóa ảnh cũ:', removeError);
        }
    
        const { data } = this.supabase.storage.from('images').getPublicUrl(newPath);
    
        return data.publicUrl;
    }
    

    async deleteImage(filePath: string): Promise<boolean> {
        if (!filePath) {
            throw new BadRequestException('Thiếu đường dẫn ảnh cần xóa');
        }

            const cleanPath = filePath.replace(/^.*images\//, '');
        
        const { error } = await this.supabase.storage.from('images').remove([cleanPath]);
    
        if (error) {
            console.error('Supabase delete error:', error);
            throw new BadRequestException('Không thể xóa ảnh khỏi Supabase');
        }
    
        return true;
    }

    private hashBuffer(buffer: Buffer): string {
        return crypto.createHash('sha256').update(buffer).digest('hex');
      }
    
      async isImageChanged(oldUrl: string, newBase64: string): Promise<boolean> {
        if (!oldUrl || !newBase64) {
          throw new BadRequestException('Thiếu dữ liệu để so sánh ảnh');
        }
    
        try {
          // Lấy ảnh cũ từ Supabase public URL
          const response = await axios.get(oldUrl, { responseType: 'arraybuffer' });
          const oldBuffer = Buffer.from(response.data);
          const oldHash = this.hashBuffer(oldBuffer);
    
          // Giải mã base64 mới
          const newBase64Data = newBase64.replace(/^data:(.+);base64,/, '');
          const newBuffer = Buffer.from(newBase64Data, 'base64');
          const newHash = this.hashBuffer(newBuffer);
    
          return oldHash !== newHash;
        } catch (err) {
          console.warn('Không thể so sánh ảnh:', err.message);
          // Nếu lỗi (VD: ảnh cũ bị xóa, link lỗi) → coi như ảnh khác
          return true;
        }
      }
}
