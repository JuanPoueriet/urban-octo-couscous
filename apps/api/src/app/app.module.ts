import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ContactController } from './contact.controller';
import { ContactService } from './contact.service';
import { DataController } from './data.controller';
import { DataService as BackendDataService } from './data.service';

@Module({
  imports: [],
  controllers: [AppController, ContactController, DataController],
  providers: [AppService, ContactService, BackendDataService],
})
export class AppModule {}
