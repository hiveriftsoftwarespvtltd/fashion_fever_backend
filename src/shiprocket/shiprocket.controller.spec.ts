import { Test, TestingModule } from '@nestjs/testing';
import { ShiprocketController } from './shiprocket.controller';

describe('ShiprocketController', () => {
  let controller: ShiprocketController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ShiprocketController],
    }).compile();

    controller = module.get<ShiprocketController>(ShiprocketController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
