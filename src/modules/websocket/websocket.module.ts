import { Module } from '@nestjs/common';
import { ChatGateway } from './chat.gateway';
import { WebRTCService } from './services/webrtc.service';
import { WebRTCController } from './controllers/webrtc.controller';
import { DatabaseModule } from '../../common/database/database.module';

@Module({
  imports: [DatabaseModule],
  providers: [ChatGateway, WebRTCService],
  controllers: [WebRTCController],
  exports: [ChatGateway, WebRTCService],
})
export class WebSocketModule {}
