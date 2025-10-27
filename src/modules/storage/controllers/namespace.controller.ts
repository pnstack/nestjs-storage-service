import { Controller, Post, Get, Body, Param, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { NamespaceService } from '../services/namespace.service';
import { CreateNamespaceDto } from '../dto/create-namespace.dto';
import { NamespaceResponseDto } from '../dto/namespace-response.dto';

@ApiTags('Namespaces')
@Controller('api/v1/namespaces')
export class NamespaceController {
  constructor(private readonly namespaceService: NamespaceService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a new namespace' })
  @ApiResponse({
    status: 201,
    description: 'Namespace created successfully',
    type: NamespaceResponseDto,
  })
  @ApiResponse({ status: 409, description: 'Namespace already exists' })
  async create(@Body() createDto: CreateNamespaceDto): Promise<NamespaceResponseDto> {
    const namespace = await this.namespaceService.create(createDto);
    return namespace;
  }

  @Get(':name')
  @ApiOperation({ summary: 'Get namespace metadata' })
  @ApiResponse({
    status: 200,
    description: 'Namespace metadata retrieved',
    type: NamespaceResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Namespace not found' })
  async getByName(@Param('name') name: string): Promise<NamespaceResponseDto> {
    const namespace = await this.namespaceService.findByName(name);
    return namespace;
  }
}
