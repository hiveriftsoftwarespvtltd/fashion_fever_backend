import { Test, TestingModule } from '@nestjs/testing';
import { ShiprocketService } from './shiprocket.service';

describe('ShiprocketService', () => {
  let service: ShiprocketService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [ShiprocketService],
    }).compile();

    service = module.get<ShiprocketService>(ShiprocketService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
