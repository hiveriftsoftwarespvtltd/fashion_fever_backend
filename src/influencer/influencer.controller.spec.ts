import { Test, TestingModule } from '@nestjs/testing';
import { InfluencerController } from './influencer.controller';

describe('InfluencerController', () => {
  let controller: InfluencerController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [InfluencerController],
    }).compile();

    controller = module.get<InfluencerController>(InfluencerController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
