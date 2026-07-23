import { NestFactory } from '@nestjs/core';
import { AppModule } from './src/app.module';
import { DashboardService } from './src/courses/dashboard.service';
import { getModelToken } from '@nestjs/mongoose';

async function bootstrap() {
  const app = await NestFactory.createApplicationContext(AppModule);
  const courseEnrollmentModel = app.get(getModelToken('CourseEnrollment'));
  const courseCategoryModel = app.get(getModelToken('CourseCategory'));
  const courseModel = app.get(getModelToken('Course'));

  const enrollments = await courseEnrollmentModel.find({}).lean();
  console.log('Enrollments:', enrollments);
  
  const categories = await courseCategoryModel.find({}).lean();
  console.log('Categories:', categories);
  
  const courses = await courseModel.find({}).lean();
  console.log('Courses:', courses);
  
  const dashboardService = app.get(DashboardService);
  const res = await dashboardService.getAdminOverview({});
  console.log('Admin Overview:', JSON.stringify(res, null, 2));

  await app.close();
}
bootstrap();
