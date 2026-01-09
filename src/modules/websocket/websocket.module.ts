import { Module } from '@nestjs/common';
import { ChatGateway } from './chat.gateway';
import { WebRTCService } from './services/webrtc.service';
import { WebRTCController } from './controllers/webrtc.controller';
import { DatabaseModule } from '../../common/database/database.module';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [DatabaseModule, AuthModule],
  providers: [ChatGateway, WebRTCService],
  controllers: [WebRTCController],
  exports: [ChatGateway, WebRTCService],
})
export class WebSocketModule {}
