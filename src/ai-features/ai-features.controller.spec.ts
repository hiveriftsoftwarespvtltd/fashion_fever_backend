import { Test, TestingModule } from '@nestjs/testing';
import { AiFeaturesController } from './ai-features.controller';

describe('AiFeaturesController', () => {
  let controller: AiFeaturesController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AiFeaturesController],
    }).compile();

    controller = module.get<AiFeaturesController>(AiFeaturesController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
