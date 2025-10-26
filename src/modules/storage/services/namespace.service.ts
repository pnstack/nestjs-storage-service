import { Injectable, ConflictException, NotFoundException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Namespace } from '../entities/namespace.entity';
import { CreateNamespaceDto } from '../dto/create-namespace.dto';
import { LoggerService } from '@/common/logger/logger.service';

@Injectable()
export class NamespaceService {
  constructor(
    @InjectRepository(Namespace)
    private readonly namespaceRepository: Repository<Namespace>,
    private readonly logger: LoggerService,
  ) {
    this.logger.setContext('NamespaceService');
  }

  async create(createDto: CreateNamespaceDto): Promise<Namespace> {
    this.logger.log(`Creating namespace: ${createDto.name}`);

    // Check if namespace already exists
    const existing = await this.namespaceRepository.findOne({
      where: { name: createDto.name },
    });

    if (existing) {
      throw new ConflictException(`Namespace '${createDto.name}' already exists`);
    }

    const namespace = this.namespaceRepository.create({
      name: createDto.name,
      displayName: createDto.displayName || null,
      quotaBytes: createDto.quotaBytes || null,
      metadata: createDto.metadata || null,
      usedBytes: 0,
      objectCount: 0,
    });

    const saved = await this.namespaceRepository.save(namespace);
    this.logger.log(`Namespace created: ${saved.id}`);
    
    return saved;
  }

  async findByName(name: string): Promise<Namespace> {
    this.logger.debug(`Finding namespace: ${name}`);
    
    const namespace = await this.namespaceRepository.findOne({
      where: { name, archivedAt: null },
    });

    if (!namespace) {
      throw new NotFoundException(`Namespace '${name}' not found`);
    }

    return namespace;
  }

  async incrementUsage(namespace: string, sizeBytes: number): Promise<void> {
    this.logger.debug(`Incrementing usage for ${namespace}: +${sizeBytes} bytes`);
    
    await this.namespaceRepository.increment(
      { name: namespace },
      'usedBytes',
      sizeBytes,
    );
    await this.namespaceRepository.increment(
      { name: namespace },
      'objectCount',
      1,
    );
  }

  async decrementUsage(namespace: string, sizeBytes: number): Promise<void> {
    this.logger.debug(`Decrementing usage for ${namespace}: -${sizeBytes} bytes`);
    
    await this.namespaceRepository.decrement(
      { name: namespace },
      'usedBytes',
      sizeBytes,
    );
    await this.namespaceRepository.decrement(
      { name: namespace },
      'objectCount',
      1,
    );
  }

  async checkQuota(namespace: string, sizeBytes: number): Promise<void> {
    const ns = await this.findByName(namespace);
    
    if (ns.quotaBytes !== null) {
      const newUsage = ns.usedBytes + sizeBytes;
      if (newUsage > ns.quotaBytes) {
        throw new ForbiddenException(
          `Quota exceeded for namespace '${namespace}': ${newUsage}/${ns.quotaBytes} bytes`,
        );
      }
    }
  }
}
