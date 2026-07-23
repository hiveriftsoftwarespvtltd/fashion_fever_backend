import {
  ExecutionContext,
  Injectable,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

@Injectable()
export class OptionalAuthGuard extends AuthGuard('jwt') {
  handleRequest(err: any, user: any) {
    // if token invalid → ignore
    if (err || !user) {
      return null;
    }

    return user;
  }

  canActivate(context: ExecutionContext) {
    return super.canActivate(context) as any;
  }
}