import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { StorageController } from './storage.controller';
import { StorageService } from './storage.service';
import { Namespace } from './entities/namespace.entity';
import { StorageObject } from './entities/object.entity';
import { AuditEvent } from './entities/audit-event.entity';
import { NamespaceService } from './services/namespace.service';
import { AuditEventService } from './services/audit-event.service';
import { ObjectStorageService } from './services/object-storage.service';
import { NamespaceController } from './controllers/namespace.controller';
import { ObjectStorageController } from './controllers/object-storage.controller';
import { NamespaceObjectsController } from './controllers/namespace-objects.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([Namespace, StorageObject, AuditEvent]),
  ],
  controllers: [
    StorageController,
    NamespaceController,
    ObjectStorageController,
    NamespaceObjectsController,
  ],
  providers: [
    StorageService,
    NamespaceService,
    AuditEventService,
    ObjectStorageService,
  ],
  exports: [
    StorageService,
    NamespaceService,
    AuditEventService,
    ObjectStorageService,
  ],
})
export class StorageModule {}
