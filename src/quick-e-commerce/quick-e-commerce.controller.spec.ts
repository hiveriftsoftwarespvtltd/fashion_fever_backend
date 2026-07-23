import { Test, TestingModule } from '@nestjs/testing';
import { QuickECommerceController } from './quick-e-commerce.controller';

describe('QuickECommerceController', () => {
  let controller: QuickECommerceController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [QuickECommerceController],
    }).compile();

    controller = module.get<QuickECommerceController>(QuickECommerceController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
