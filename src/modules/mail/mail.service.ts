import { Injectable, Logger, BadRequestException } from "@nestjs/common";
import * as nodemailer from 'nodemailer'
import { ConfigService } from "@nestjs/config";
import { SentMessageInfo } from "nodemailer";


interface IEmailOptions {
    to: string,
    from?: string,
    subject: string,
    cc?: string[], 
    html: string,
}

@Injectable()
export class MailService {
    private readonly logger = new Logger(MailService.name);

    private transporter: nodemailer.Transporter

  constructor(
    private readonly configService: ConfigService
  ){
    this.transporter = nodemailer.createTransport({
      host: this.configService.get<string>('MAIL_HOST'),
      port: this.configService.get<number>('MAIL_PORT'),
      secure: false,
      auth: {
          user: this.configService.get<string>('MAIL_USER'),
          pass: this.configService.get<string>('MAIL_PASSWORD')
      }
    })
  }

  async send(options: IEmailOptions): Promise<SentMessageInfo> {
    const mailOptions: nodemailer.SendMailOptions  = {
        from: options.from || this.configService.get<string>('MAIL_FROM'),
        to: options.to,
        subject: options.subject,
        html: options.html
    }

    try {
        const mailInfo: unknown = await this.transporter.sendMail(mailOptions)
        this.logger.log('Đang gửi mail...')
        return mailInfo;

    } catch (error) {
        throw new BadRequestException(`Gửi email không thành công: ${error instanceof Error ? error.message : 'Lỗi không xác định'}}`)
    }
  }
  async sendForgotResetEmail(to: string, otp: string): Promise<SentMessageInfo>{
    const subject = 'Email yêu cầu lấy lại mật khẩu'
    const html = `
        <div>
            <h2>Yêu cầu lấy lại mật khẩu</h2>
            <p>Nhập mã OTP bên dưới để tiến hành lấy lại mật khẩu của bạn:</p>
            <p>Mã: ${otp}</p>
            <p>Yêu cầu có thời hạn 1 tiếng</p>
        </div>
    `
    await this.send({ to, subject, html })
  }

  async sendVerificationEmail(to: string, verficationToken: string): Promise<SentMessageInfo>{
    const resetLink = `${process.env.FRONTEND_URL}/auth/verify-email?token=${verficationToken}`
    const subject = 'Email yêu cầu xác thực'
    const html = `
        <div>
            <h2>Yêu cầu xác thực</h2>
            <p>Click vào link bên dưới để tiến hành xác thực của bạn:</p>
            <p><a href="${resetLink}" target="_blank">Xác thực</a></p>
            <p>Yêu cầu có thời hạn 1 tiếng</p>
        </div>
    `
    await this.send({ to, subject, html })
  }
}