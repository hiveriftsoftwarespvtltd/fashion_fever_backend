import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotAcceptableException,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { UserService } from 'src/user/user.service';
import * as bcrypt from 'bcryptjs';
import { InjectModel } from '@nestjs/mongoose';
import { User, UserRole, AuthType, RoleStatus } from 'src/user/schema/user.schema';
import { Model, Types } from 'mongoose';
import { OAuth2Client } from 'google-auth-library';
import { RegisterDTO } from './dto/register.dto';
import { ApiResponse } from 'src/common/responses/api-response';
import { LoginDTO } from './dto/login.dto';
import { GoogleLoginDTO } from './dto/google-login.dto';
import {
  forgotPasswordTemplate,
  loginOtpTemplate,
  verificationTemplate,
} from 'src/utils/email.template';
import { generateOTP, sendMail } from 'src/utils/helper';
import { VerifyEmailDTO } from './dto/verify-email.dto';
import { VerifyLoginDTO } from './dto/verify-login.dto';
import { ResetPasswordDTO } from './dto/reset-password.dto';
import { ForgotPasswordOTPDTO } from './dto/verify-forgot-password-otp.dto';
import { Vendor } from 'src/vendor/schema/vendor.schema';
import { ServiceProvider } from 'src/service/schema/service-provider.schema';
import { UserWalletService } from 'src/wallet/service/user/user.wallet.service';
import { AffiliateTrackingService } from 'src/influencer/affiliate-tracking.service';
import { Influencer, InfluencerDocument, InfluencerStatus } from 'src/influencer/schema/influencer.schema';
import { Educator, EducatorDocument, EducatorStatus } from 'src/courses/schema/educator.schema';
import { Admin, AdminDocument } from 'src/admin/schema/admin.schema';

@Injectable()
export class AuthService {
  constructor(
    @InjectModel(User.name) private userModel: Model<User>,
    @InjectModel(Vendor.name) private vendorModel: Model<Vendor>,
    @InjectModel(ServiceProvider.name) private serviceProviderModel: Model<ServiceProvider>,
    @InjectModel(Influencer.name) private influencerModel: Model<InfluencerDocument>,
    @InjectModel(Educator.name) private educatorModel: Model<EducatorDocument>,
    @InjectModel(Admin.name) private adminModel: Model<AdminDocument>,
    private userService: UserService,
    private jwtService: JwtService,
    private userWalletService: UserWalletService,
    private affiliateTrackingService: AffiliateTrackingService,
  ) { }

  async register(dto: RegisterDTO) {
    const existingUser = await this.userModel.findOne({
      email: dto.email.toLowerCase(),
    });

    // block restricted roles
    if (dto.roles && dto.roles.length > 0) {
      const restrictedRoles = [UserRole.ADMIN, UserRole.INFLUENCER, UserRole.DISTRIBUTOR, UserRole.SUPER_ADMIN, UserRole.DELIVERY_PERSON];
      for (const r of dto.roles) {
        if (restrictedRoles.includes(r)) {
          throw new BadRequestException(
            `You are not authorized to create ${r} account`,
          );
        }
      }
    }

    // verified user already exists
    if (
      existingUser &&
      !existingUser.isDeleted &&
      existingUser.isEmailVerified
    ) {
      throw new BadRequestException('Email already exists');
    }

    // generate otp
    const otp = generateOTP();

    // expiry
    const otpExpiresAt = new Date(Date.now() + 10 * 60 * 1000);

    // resend otp if email not verified
    if (
      existingUser &&
      !existingUser.isDeleted &&
      !existingUser.isEmailVerified
    ) {
      existingUser.name = dto.name;
      existingUser.password = await bcrypt.hash(dto.password, 10);
      if (dto.phone) {
        existingUser.phone = dto.phone;
      }
      if (dto.roles) {
        existingUser.roles = dto.roles as any;
        const roleStatus = new Map<UserRole, RoleStatus>();
        dto.roles.forEach((r) => roleStatus.set(r, RoleStatus.NOT_ONBOARDED));
        existingUser.roleStatus = roleStatus;
      }

      existingUser.otp = otp;
      existingUser.otpExpiresAt = otpExpiresAt;

      await existingUser.save();

      await sendMail(
        existingUser.email,
        'Verify Your Email',
        verificationTemplate(existingUser.name, otp),
      );

      return ApiResponse.success(
        'Verification OTP sent to your email',
        otp,
        200,
      );
    }

    // hash password only when needed
    const hashedPassword = await bcrypt.hash(dto.password, 10);

    // restore deleted user
    if (existingUser && existingUser.isDeleted) {
      existingUser.name = dto.name;
      existingUser.password = hashedPassword;
      if (dto.phone) {
        existingUser.phone = dto.phone;
      }
      if (dto.roles) {
        existingUser.roles = dto.roles as any;
        const roleStatus = new Map<UserRole, RoleStatus>();
        dto.roles.forEach((r) => roleStatus.set(r, RoleStatus.NOT_ONBOARDED));
        existingUser.roleStatus = roleStatus;
      }

      existingUser.otp = otp;
      existingUser.otpExpiresAt = otpExpiresAt;

      existingUser.isDeleted = false;
      existingUser.isEmailVerified = false;

      existingUser.isActive = (dto.roles && dto.roles.includes(UserRole.VENDOR)) ? false : true;

      await existingUser.save();

      await sendMail(
        existingUser.email,
        'Verify Your Email',
        verificationTemplate(existingUser.name, otp),
      );

      return ApiResponse.success(
        'Registration successful. OTP sent to email',
        otp,
        201,
      );
    }

    const requestedRoles = dto.roles ?? [];

    // new user creation
    const initialRoles = Array.from(
      new Set([
        UserRole.USER

      ]),
    );

    const initialRoleStatuses = new Map<UserRole, RoleStatus>();

    initialRoleStatuses.set(
      UserRole.USER,
      RoleStatus.APPROVED,
    );

    requestedRoles.forEach((role) => {
      if (role !== UserRole.USER) {
        initialRoleStatuses.set(
          role,
          RoleStatus.NOT_ONBOARDED,
        );
      }
    });
    // const initialRoles = dto.roles || [UserRole.USER];
    // const initialRoleStatuses = new Map<UserRole, RoleStatus>();
    // initialRoles.forEach((role) => {
    //   initialRoleStatuses.set(
    //     role,
    //     role === UserRole.USER
    //       ? RoleStatus.APPROVED
    //       : RoleStatus.NOT_ONBOARDED,
    //   );
    // });

    const user = await this.userModel.create({
      ...dto,
      roles: initialRoles,
      roleStatus: initialRoleStatuses,
      email: dto.email.toLowerCase(),
      password: hashedPassword,
      otp,
      otpExpiresAt,
      isEmailVerified: false,
      isActive: true,
    });



    await sendMail(
      user.email,
      'Verify Your Email',
      verificationTemplate(user.name, otp),
    );

    return ApiResponse.success(
      'Registration successful. OTP sent to email',
      otp,
      201,
    );
  }

  async sendVerifyEmailOTP(email: string) {
    const user = await this.userModel.findOne({ email });
    if (!user) {
      throw new NotFoundException('User Not Found');
    }

    if (user.isEmailVerified) {
      throw new ConflictException('This email is already verified');
    }

    const otp = generateOTP();

    // expiry
    const otpExpiresAt = new Date(Date.now() + 10 * 60 * 1000);
    user.otp = otp;
    user.otpExpiresAt = otpExpiresAt;

    await user.save();
    await sendMail(
      email,
      'Verify Your Email',
      verificationTemplate(user.name, otp),
    );
    return ApiResponse.success(
      'Verification OTP successfully sent on your mail',
      otp,
    );
  }

  async verifyEmail(dto: VerifyEmailDTO, referralCode?: string) {
    const user = await this.userModel.findOne({
      email: dto.email.toLowerCase(),
    });

    if (!user) {
      throw new BadRequestException('User not found');
    }

    if (user.isEmailVerified) {
      throw new BadRequestException('Email already verified');
    }

    if (user.otp !== dto.otp) {
      throw new BadRequestException('Invalid OTP');
    }

    if (!user.otpExpiresAt || user.otpExpiresAt < new Date()) {
      throw new BadRequestException('OTP expired');
    }

    console.log("Referral Code", referralCode)
    if (referralCode) {
      const program = await this.affiliateTrackingService.trackSignup(user._id, referralCode);
      console.log("Referral Code", program)
      user.affliateProgramId = program?._id
      user.referredByInfluencerId = program?.influencerId
      // user.save()

    }

    user.isEmailVerified = true;

    user.otp = undefined;
    user.otpExpiresAt = undefined;

    await user.save();

    if (user.roles && user.roles.includes(UserRole.USER)) {
      await this.userWalletService.initializeWallet(user._id.toString());
    }

    return ApiResponse.success('Email verified successfully', null, 200);
  }

  async login(dto: LoginDTO) {
    const user = await this.userModel.findOne({
      email: dto.email.toLowerCase(),
    });

    if (!user) {
      throw new UnauthorizedException('Invalid Credentials');
    }

    if (!user.password) {
      throw new UnauthorizedException('Login with Google');
    }

    if (!user.isEmailVerified) {
      throw new UnauthorizedException('Please verify your email first');
    }

    if (!user.isActive) {
      throw new NotAcceptableException('Your account is not active');
    }

    if (user.roles && user.roles.includes(UserRole.VENDOR)) {
      const vendor = await this.vendorModel.findOne({ ownerId: user._id });

      if (vendor?.status === 'PENDING') {
        throw new ConflictException('You account is not approved by admin');
      } else if (vendor?.status === 'REJECTED') {
        throw new ConflictException('Your account is rejected by admin');
      }
    }

    if (user.roles && user.roles.includes(UserRole.SERVICE_PROVIDER)) {
      const serviceProvider = await this.serviceProviderModel.findOne({ ownerId: new Types.ObjectId(user._id) });

      if (serviceProvider?.verificationStatus === 'PENDING') {
        throw new ConflictException('You account is not approved by admin');
      } else if (serviceProvider?.verificationStatus === 'REJECTED') {
        throw new ConflictException('Your account is rejected by admin');
      }
    }

    if (user.roles && user.roles.includes(UserRole.INFLUENCER)) {
      const influencer = await this.influencerModel.findOne({ userId: new Types.ObjectId(user._id) })
      if (influencer?.status === InfluencerStatus.PENDING) {
        throw new ConflictException("You account is not approved by admin");
      } else if (influencer?.status === InfluencerStatus.REJECTED) {
        throw new ConflictException("Your account is rejected by admin");
      } else if (influencer?.status === InfluencerStatus.BLOCKED) {
        throw new ConflictException("Your account is blocked by admin");
      }
    }

    if (user.roles && user.roles.includes(UserRole.EDUCATOR)) {
      const educator = await this.educatorModel.findOne({ userId: new Types.ObjectId(user._id) })
      if (educator?.status === EducatorStatus.PENDING) {
        throw new ConflictException("You account is not approved by admin");
      } else if (educator?.status === EducatorStatus.REJECTED) {
        throw new ConflictException("Your account is rejected by admin");
      } else if (educator?.status === EducatorStatus.BLOCKED) {
        throw new ConflictException("Your account is blocked by admin");
      }
    }

    const isMatch = await bcrypt.compare(dto.password, user.password);

    if (!isMatch) {
      throw new UnauthorizedException('Invalid Credentials');
    }

    // generate login otp
    // const otp = generateOTP();

    // user.otp = otp;

    // user.otpExpiresAt = new Date(Date.now() + 5 * 60 * 1000);

    // await user.save();

    // send login otp
    // await sendMail(user.email, 'Login OTP', loginOtpTemplate(user.name, otp));

    const payload = {
      sub: user._id,
      email: user.email,
      roles: user.roles,
    };


    const token = await this.jwtService.signAsync(payload);

    const { password, ...safeUser } = user.toObject();

    let moduleAccess: any = undefined;
    if (user.roles && (user.roles.includes(UserRole.ADMIN) || user.roles.includes(UserRole.SUPER_ADMIN))) {
      const adminData = await this.adminModel.findOne({ userId: user._id });
      if (adminData) {
        moduleAccess = adminData.moduleAccess;
      }
    }

    return ApiResponse.success(
      'Login successful',
      {
        safeUser,
        access_token: token,
        ...(moduleAccess && { moduleAccess }),
      },
      200,
    );
  }

  async googleLogin(dto: GoogleLoginDTO) {
    const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);
    try {
      const ticket = await client.verifyIdToken({
        idToken: dto.idToken,
        audience: process.env.GOOGLE_CLIENT_ID,
      });
      const payload = ticket.getPayload();

      if (!payload || !payload.email) {
        throw new UnauthorizedException('Invalid Google Token');
      }

      const email = payload.email.toLowerCase();
      let user = await this.userModel.findOne({ email });

      if (!user) {
        // Check restricted roles for registration
        if (dto.roles && dto.roles.length > 0) {
          const restrictedRoles = [UserRole.ADMIN, UserRole.INFLUENCER, UserRole.DISTRIBUTOR];
          for (const r of dto.roles) {
            if (restrictedRoles.includes(r)) {
              throw new BadRequestException(`You are not authorized to create ${r} account`);
            }
          }
        }

        const initialRoles = [UserRole.USER];
        const initialRoleStatuses = new Map<UserRole, RoleStatus>();
        initialRoles.forEach((r) => initialRoleStatuses.set(r, RoleStatus.NOT_ONBOARDED));

        // Create user
        user = await this.userModel.create({
          name: payload.name || 'Google User',
          email,
          googleId: payload.sub,
          isEmailVerified: true,
          isActive: (dto.roles && dto.roles.includes(UserRole.VENDOR)) ? false : true,
          roles: initialRoles,
          roleStatus: initialRoleStatuses,
          authTypes: [AuthType.GOOGLE]
        });

        if (user.roles.includes(UserRole.USER)) {
          await this.userWalletService.initializeWallet(user._id.toString());
        }
      } else {
        // User exists, update googleId and authTypes if not present
        if (!user.googleId) {
          user.googleId = payload.sub;
          if (!user.authTypes) user.authTypes = [];
          if (!user.authTypes.includes(AuthType.GOOGLE)) {
            user.authTypes.push(AuthType.GOOGLE);
          }
          user.isEmailVerified = true;
          await user.save();
        }

        if (user.isDeleted) {
          throw new UnauthorizedException('Your account is deleted');
        }
        if (!user.isActive) {
          throw new NotAcceptableException('Your account is not active');
        }

        if (user.roles && user.roles.includes(UserRole.VENDOR)) {
          const vendor = await this.vendorModel.findOne({ ownerId: user._id });
          if (vendor?.status === 'PENDING') {
            throw new ConflictException('You account is not approved by admin');
          } else if (vendor?.status === 'REJECTED') {
            throw new ConflictException('Your account is rejected by admin');
          }
        }

        if (user.roles && user.roles.includes(UserRole.SERVICE_PROVIDER)) {
          const serviceProvider = await this.serviceProviderModel.findOne({ ownerId: new Types.ObjectId(user._id) });
          if (serviceProvider?.verificationStatus === 'PENDING') {
            throw new ConflictException('You account is not approved by admin');
          } else if (serviceProvider?.verificationStatus === 'REJECTED') {
            throw new ConflictException('Your account is rejected by admin');
          }
        }

        if (user.roles && user.roles.includes(UserRole.INFLUENCER)) {
          const influencer = await this.influencerModel.findOne({ userId: new Types.ObjectId(user._id) })
          if (influencer?.status === InfluencerStatus.PENDING) {
            throw new ConflictException("You account is not approved by admin");
          } else if (influencer?.status === InfluencerStatus.REJECTED) {
            throw new ConflictException("Your account is rejected by admin");
          } else if (influencer?.status === InfluencerStatus.BLOCKED) {
            throw new ConflictException("Your account is blocked by admin");
          }
        }

        if (user.roles && user.roles.includes(UserRole.EDUCATOR)) {
          const educator = await this.educatorModel.findOne({ userId: new Types.ObjectId(user._id) })
          if (educator?.status === EducatorStatus.PENDING) {
            throw new ConflictException("You account is not approved by admin");
          } else if (educator?.status === EducatorStatus.REJECTED) {
            throw new ConflictException("Your account is rejected by admin");
          } else if (educator?.status === EducatorStatus.BLOCKED) {
            throw new ConflictException("Your account is blocked by admin");
          }
        }
      }

      const jwtPayload = {
        sub: user._id,
        email: user.email,
        roles: user.roles,
      };

      const token = await this.jwtService.signAsync(jwtPayload);
      const { password, ...safeUser } = user.toObject();

      let moduleAccess: any = undefined;
      if (user.roles && (user.roles.includes(UserRole.ADMIN) || user.roles.includes(UserRole.SUPER_ADMIN))) {
        const adminData = await this.adminModel.findOne({ userId: user._id });
        if (adminData) {
          moduleAccess = adminData.moduleAccess;
        }
      }

      return ApiResponse.success(
        'Google login successful',
        {
          safeUser,
          access_token: token,
          ...(moduleAccess && { moduleAccess }),
        },
        200,
      );
    } catch (e: any) {
      if (e instanceof UnauthorizedException || e instanceof ConflictException || e instanceof NotAcceptableException || e instanceof BadRequestException) {
        throw e;
      }
      throw new UnauthorizedException('Invalid Google Token');
    }
  }

  async verifyLoginOtp(dto: VerifyLoginDTO) {

    const user = await this.userModel.findOne({
      email: dto.email.toLowerCase(),
    });

    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    if (user.otp !== dto.otp) {
      throw new UnauthorizedException('Invalid OTP');
    }

    if (!user.otpExpiresAt || user.otpExpiresAt < new Date()) {
      throw new UnauthorizedException('OTP expired');
    }

    // clear otp
    user.otp = undefined;
    user.otpExpiresAt = undefined;

    await user.save();

    const payload = {
      sub: user._id,
      email: user.email,
      roles: user.roles,
    };

    const token = await this.jwtService.signAsync(payload);

    const { password, ...safeUser } = user.toObject();

    return ApiResponse.success(
      'Login successful',
      {
        safeUser,
        access_token: token,
      },
      200,
    );
  }

  async resetPassword(dto: ResetPasswordDTO, userId: string) {
    const user = await this.userModel.findOne({
      _id: userId,
      email: dto.email.toLowerCase(),
    });

    if (!user) {
      throw new BadRequestException('Unauthorized user or email mismatch');
    }

    if (!user.password) {
      throw new BadRequestException(
        'Google account cannot reset password this way',
      );
    }

    const isMatch = await bcrypt.compare(dto.oldPassword, user.password);

    if (!isMatch) {
      throw new BadRequestException('Old password is incorrect');
    }

    if (dto.newPassword !== dto.confirmPassword) {
      throw new BadRequestException('Passwords do not match');
    }

    if (dto.oldPassword === dto.newPassword) {
      throw new BadRequestException(
        'New password cannot be same as old password',
      );
    }

    const hashedPassword = await bcrypt.hash(dto.newPassword, 10);

    user.password = hashedPassword;

    await user.save();

    return ApiResponse.success('Password reset successful', null, 200);
  }

  async sendForgotPasswordOTP(email: string) {
    const user = await this.userModel.findOne({
      email: email.toLowerCase(),
    });

    if (!user) {
      throw new BadRequestException('User not found');
    }

    const otp = generateOTP();

    user.otp = otp;

    user.otpExpiresAt = new Date(Date.now() + 10 * 60 * 1000);

    await user.save();

    await sendMail(
      user.email,
      'Forgot Password OTP',
      forgotPasswordTemplate(user.name, otp),
    );

    return ApiResponse.success('OTP sent successfully', null, 200);
  }

  async verifyForgotPasswordOTP(dto: ForgotPasswordOTPDTO) {
    const user = await this.userModel.findOne({
      email: dto.email.toLowerCase(),
    });

    if (!user) {
      throw new BadRequestException('User not found');
    }

    if (user.otp !== dto.otp) {
      throw new BadRequestException('Invalid OTP');
    }

    if (!user.otpExpiresAt || user.otpExpiresAt < new Date()) {
      throw new BadRequestException('OTP expired');
    }

    if (dto.newPassword !== dto.confirmPassword) {
      throw new BadRequestException('Passwords do not match');
    }

    const hashedPassword = await bcrypt.hash(dto.newPassword, 10);

    user.password = hashedPassword;

    // clear otp
    user.otp = undefined;
    user.otpExpiresAt = undefined;

    await user.save();

    return ApiResponse.success('Password updated successfully', null, 200);
  }
}
