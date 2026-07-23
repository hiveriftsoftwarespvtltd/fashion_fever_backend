import { BadRequestException } from '@nestjs/common';
import axios from 'axios';
import * as nodemailer from 'nodemailer';
import { WeekDay } from 'src/service/schema/service-availability.schema';

export const generateOTP = (): string => {
  return Math.floor(
    100000 + Math.random() * 900000,
  ).toString();
};

// create transporter once
let transporter: nodemailer.Transporter | null = null;

const getTransporter = (): nodemailer.Transporter => {
  if (!transporter) {
    transporter = nodemailer.createTransport({
      pool: true,
      service: 'gmail',
      auth: {
        user: process.env.GMAIL_USER,
        pass: process.env.GMAIL_PASS,
      },
    });
  }
  return transporter;
};

export const sendMail = async (
  to: string,
  subject: string,
  html: string,
): Promise<boolean> => {
  try {
    const mailTransporter = getTransporter();



    await mailTransporter.sendMail({
      from: process.env.GMAIL_USER,
      to,
      subject,
      html,
    });

    return true;
  } catch (error) {
    console.log('MAIL ERROR:', error);

    throw new BadRequestException(
      'Unable to send email at the moment. Please try again later.',
    );
  }
};

export const safeSendMail = async (
  to: string,
  subject: string,
  html: string,
): Promise<{ success: boolean; error?: any }> => {
  try {
    await sendMail(to, subject, html);
    return { success: true };
  } catch (error) {
    console.log('EMAIL FAILED:', error);

    return {
      success: false,
      error,
    };
  }
};

export const toSlug = (str: string): string => {
  return str
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, '')
    .replace(/\s+/g, '_');
};
export const getWeekDay = (date: Date): WeekDay => {
  const days: WeekDay[] = [
    WeekDay.SUNDAY,
    WeekDay.MONDAY,
    WeekDay.TUESDAY,
    WeekDay.WEDNESDAY,
    WeekDay.THURSDAY,
    WeekDay.FRIDAY,
    WeekDay.SATURDAY,
  ];

  return days[date.getDay()];
}

export const toMinutes = (time: string): number => {
  const [h, m] = time.split(':').map(Number);
  return h * 60 + m;
}

export const toTimeString = (minutes: number): string => {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;

  return `${h.toString().padStart(2, '0')}:${m
    .toString()
    .padStart(2, '0')}`;
}

export const calculateEndTime = (
  startTime: Date | string,
  durationMinutes: number,
): Date => {
  const date = new Date(startTime);
  if (isNaN(date.getTime())) {
    throw new BadRequestException('Invalid start time');
  }
  return new Date(date.getTime() + durationMinutes * 60000);
};

export const formatTimeIST = (date: Date | string): string => {
  if (!date) return '';
  return new Date(date).toLocaleTimeString('en-IN', {
    timeZone: 'Asia/Kolkata',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true
  }).toUpperCase();
};

export const formatDateIST = (date: Date | string): string => {
  if (!date) return '';
  return new Date(date).toLocaleDateString('en-IN', {
    timeZone: 'Asia/Kolkata',
    day: '2-digit',
    month: 'short',
    year: 'numeric'
  });
};

export const formatDateTimeIST = (date: Date | string): string => {
  if (!date) return '';
  return `${formatDateIST(date)} at ${formatTimeIST(date)}`;
};

export const geocodePincode = async (
  pincode: string,
): Promise<{ lat: number; lng: number } | null> => {
  try {
    const response = await axios.get(
      'https://maps.googleapis.com/maps/api/geocode/json',
      {
        params: {
          address: pincode,
          key: process.env.GOOGLE_MAPS_API_KEY,
        },
      },
    );

    const location = response.data.results?.[0]?.geometry?.location;

    if (!location) {
      console.warn(`No geocode result for pincode: ${pincode}`);
      return null;
    }

    return {
      lat: location.lat,
      lng: location.lng,
    };
  } catch (error) {
    console.error('Geocoding failed:', error?.message || error);
    return null;
  }
};

export const filteredObject = (dto: any) => {
  return Object.fromEntries(Object.entries(dto).filter(([key, value]) => (value !== null && value !== undefined && (typeof value !== 'string' || value.trim().length > 0))))
}

export const notifyAdmins = async (
  userModel: any,
  subject: string,
  html: string,
): Promise<void> => {
  try {
    const admins = await userModel.find({ role: 'admin', isActive: true, isDeleted: false });
    const emailPromises = admins.map((admin: any) => safeSendMail(admin.email, subject, html));
    await Promise.allSettled(emailPromises);
  } catch (error) {
    console.error('Failed to notify admins:', error);
  }
};