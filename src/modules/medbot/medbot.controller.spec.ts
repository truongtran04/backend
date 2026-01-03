import { Test, TestingModule } from '@nestjs/testing';
import { MedbotController } from './medbot.controller';
import { MedbotService } from './medbot.service';
import { JwtAuthGuard } from 'src/common/guards/jwt-auth.guard';
import { RolesGuard } from 'src/common/guards/roles.guard';
import { ActiveUserGuard } from 'src/common/guards/active-user.guard';
import { HttpStatus } from '@nestjs/common';
import { ApiResponse } from 'src/common/bases/api-reponse';

describe('MedbotController', () => {
  let controller: MedbotController;
  let service: MedbotService;

  const mockMedbotService = {
    processUserMessage: jest.fn().mockResolvedValue('test response'),
  };

  const mockRequest = {
    user: {
      userId: 'test-user-id',
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [MedbotController],
      providers: [
        {
          provide: MedbotService,
          useValue: mockMedbotService,
        },
      ],
    })
    .overrideGuard(JwtAuthGuard).useValue({ canActivate: () => true })
    .overrideGuard(RolesGuard).useValue({ canActivate: () => true })
    .overrideGuard(ActiveUserGuard).useValue({ canActivate: () => true })
    .compile();

    controller = module.get<MedbotController>(MedbotController);
    service = module.get<MedbotService>(MedbotService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('chat', () => {
    it('should call medbotService.processUserMessage and return a success response', async () => {
      const chatRequest = { prompt: 'hello' };
      const expectedResult = ApiResponse.suscess(
        'test response',
        'Success',
        HttpStatus.OK,
      );

      const result = await controller.chat(chatRequest, mockRequest);

      expect(service.processUserMessage).toHaveBeenCalledWith(
        chatRequest.prompt,
        mockRequest.user.userId,
      );
      expect(result).toEqual(expectedResult);
    });
  });
});
