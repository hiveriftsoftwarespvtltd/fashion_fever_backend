import { Test, TestingModule } from '@nestjs/testing';
import { QuickECommerceService } from './quick-e-commerce.service';

describe('QuickECommerceService', () => {
  let service: QuickECommerceService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [QuickECommerceService],
    }).compile();

    service = module.get<QuickECommerceService>(QuickECommerceService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
