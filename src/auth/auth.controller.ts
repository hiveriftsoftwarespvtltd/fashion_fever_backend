import { Body, Controller, Post, Req, UseGuards } from '@nestjs/common';
import { AuthService } from './auth.service';
import { RegisterDTO } from './dto/register.dto';
import { LoginDTO } from './dto/login.dto';
import { GoogleLoginDTO } from './dto/google-login.dto';
import { VerifyEmailDTO } from './dto/verify-email.dto';
import { VerifyLoginDTO } from './dto/verify-login.dto';
import { ResetPasswordDTO } from './dto/reset-password.dto';
import { ForgotPasswordOTPDTO } from './dto/verify-forgot-password-otp.dto';
import { AuthGuard } from '@nestjs/passport';
import { JwtAuthGuard } from './jwt-auth.guad';

@Controller('auth')
export class AuthController {
    constructor(private authService: AuthService) { }

    @Post('register')
    register(@Body() dto: RegisterDTO) {
        return this.authService.register(dto)
    }

    @Post('login')
    login(@Body() dto: LoginDTO) {
        return this.authService.login(dto)
    }

    @Post('google')
    googleLogin(@Body() dto: GoogleLoginDTO) {
        return this.authService.googleLogin(dto);
    }

    @Post('verify-email')
    verifyEmail(@Body() dto: VerifyEmailDTO, @Req() req: any) {
        return this.authService.verifyEmail(dto, req.cookies?.referralCode,)
    }

    @Post('verify-login-otp')
    verifyLoginOTP(@Body() dto: VerifyLoginDTO) {
        return this.authService.verifyLoginOtp(dto)
    }

    @UseGuards(JwtAuthGuard)
    @Post('reset-password')
    resetPassword(@Req() req: any, @Body() dto: ResetPasswordDTO) {
        return this.authService.resetPassword(dto, req.user._id)
    }


    @Post('send-forgot-password-otp')
    forgotPasswordOTP(@Body('email') email: string) {
        return this.authService.sendForgotPasswordOTP(email)
    }


    @Post('verify-forgot-password-otp')
    verifyForgotPasswordOTP(@Body() dto: ForgotPasswordOTPDTO) {
        return this.authService.verifyForgotPasswordOTP(dto)
    }

    @Post('send-verify-email-otp')
    sendVerifyEmailOTP(@Body('email') email: string) {
        return this.authService.sendVerifyEmailOTP(email)
    }
}
