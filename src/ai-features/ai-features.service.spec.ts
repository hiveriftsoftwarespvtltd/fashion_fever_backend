import { Test, TestingModule } from '@nestjs/testing';
import { AiFeaturesService } from './ai-features.service';

describe('AiFeaturesService', () => {
  let service: AiFeaturesService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [AiFeaturesService],
    }).compile();

    service = module.get<AiFeaturesService>(AiFeaturesService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
