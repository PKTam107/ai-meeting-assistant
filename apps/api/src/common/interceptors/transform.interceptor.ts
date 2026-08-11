import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
  StreamableFile,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

export interface ApiResponse<T> {
  success: true;
  data: T;
}

/**
 * Wraps every successful response in a consistent envelope: { success, data }.
 * Errors are handled separately by AllExceptionsFilter.
 */
@Injectable()
export class TransformInterceptor<T> implements NestInterceptor<
  T,
  ApiResponse<T>
> {
  intercept(
    _context: ExecutionContext,
    next: CallHandler<T>,
  ): Observable<ApiResponse<T>> {
    return next.handle().pipe(
      map((data) =>
        // File downloads (and any raw stream) bypass the JSON envelope.
        data instanceof StreamableFile
          ? (data as unknown as ApiResponse<T>)
          : { success: true, data },
      ),
    );
  }
}
