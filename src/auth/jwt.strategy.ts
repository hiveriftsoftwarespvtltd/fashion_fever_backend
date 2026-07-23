import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { InjectModel } from '@nestjs/mongoose';
import { User, UserDocument } from 'src/user/schema/user.schema';
import { Model } from 'mongoose';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(configService: ConfigService, @InjectModel(User.name) private userModel: Model<UserDocument>) {
    const secret = configService.get<string>('JWT_SECRET');

    if (!secret) {
      throw new Error('JWT_SECRET not defined');
    }

    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(), // ✅ REQUIRED
      ignoreExpiration: false,
      secretOrKey: secret,
    });
  }

  async validate(payload: any) {



    if (!payload.sub) {
      throw new UnauthorizedException()
    }

    const user = await this.userModel.findById(payload.sub).select("name email roles isActive vendorId serviceProviderId influencerId distributorId educatorId")

    if (!user) {
      throw new UnauthorizedException("User not found")
    }
    if (!user?.isActive) {
      throw new UnauthorizedException("User is not active")
    }




    return {
      _id: user._id,
      email: user.email,
      name: user.name,
      roles: user.roles,
      vendorId: user.vendorId,
      influencerId: user.influencerId,
      serviceProviderId: user.serviceProviderId,
      distributorId: user.distributorId,
      educatorId: user.educatorId
    }
  }
}