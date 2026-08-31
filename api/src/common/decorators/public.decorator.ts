import { SetMetadata } from '@nestjs/common';

/** Marca uma rota como pública — pula JwtAuthGuard */
export const IS_PUBLIC_KEY = 'isPublic';
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);
