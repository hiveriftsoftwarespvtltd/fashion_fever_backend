import {
  ExecutionContext,
  Injectable,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

@Injectable()
export class OptionalAuthGuard extends AuthGuard('jwt') {
  async canActivate(context: ExecutionContext) {
    try {
      return (await super.canActivate(context)) as boolean;
    } catch {
      return true;
    }
  }

  handleRequest(err: any, user: any) {
    if (err || !user) {
      return null;
    }
    return user;
  }
}