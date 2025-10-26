import { Controller, Get, Param, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiQuery } from '@nestjs/swagger';
import { ObjectStorageService } from '../services/object-storage.service';
import { ObjectResponseDto } from '../dto/object-response.dto';

@ApiTags('Objects')
@Controller('api/v1/namespaces/:namespace/objects')
export class NamespaceObjectsController {
  constructor(private readonly objectStorageService: ObjectStorageService) {}

  @Get()
  @ApiOperation({ summary: 'List objects in a namespace' })
  @ApiQuery({ name: 'prefix', required: false, type: String })
  @ApiQuery({ name: 'limit', required: false, type: Number, example: 100 })
  @ApiQuery({ name: 'offset', required: false, type: Number, example: 0 })
  @ApiResponse({
    status: 200,
    description: 'Objects listed successfully',
    schema: {
      type: 'object',
      properties: {
        items: { type: 'array', items: { $ref: '#/components/schemas/ObjectResponseDto' } },
        total: { type: 'number' },
        limit: { type: 'number' },
        offset: { type: 'number' },
      },
    },
  })
  async list(
    @Param('namespace') namespace: string,
    @Query('prefix') prefix?: string,
    @Query('limit') limit?: number,
    @Query('offset') offset?: number,
  ): Promise<{
    items: ObjectResponseDto[];
    total: number;
    limit: number;
    offset: number;
  }> {
    const limitNum = limit ? Math.min(parseInt(limit.toString(), 10), 1000) : 100;
    const offsetNum = offset ? parseInt(offset.toString(), 10) : 0;

    const { items, total } = await this.objectStorageService.listByNamespace(
      namespace,
      prefix,
      limitNum,
      offsetNum,
    );

    return {
      items,
      total,
      limit: limitNum,
      offset: offsetNum,
    };
  }
}
