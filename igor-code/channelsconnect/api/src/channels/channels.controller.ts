import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  ParseIntPipe,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOkResponse,
  ApiCreatedResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { ChannelsService } from './channels.service';
import { CreateChannelDto } from './dto/create-channel.dto';
import { UpdateChannelDto } from './dto/update-channel.dto';
import { ChannelEntity } from './entities/channel.entity';

@Controller('channels')
@ApiTags('channels')
@ApiBearerAuth()
export class ChannelsController {
  constructor(private readonly channelsService: ChannelsService) {}

  @Post()
  @ApiCreatedResponse({ type: ChannelEntity })
  create(@Body() createChannelDto: CreateChannelDto) {
    return this.channelsService.create(createChannelDto);
  }

  @Get()
  @ApiOkResponse({ type: ChannelEntity, isArray: true })
  findAll() {
    return this.channelsService.findAll();
  }

  @Get('active')
  @ApiOkResponse({ type: ChannelEntity, isArray: true })
  findActive() {
    return this.channelsService.findActive();
  }

  @Get(':id')
  @ApiOkResponse({ type: ChannelEntity })
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.channelsService.findOne(id);
  }

  @Patch(':id')
  @ApiOkResponse({ type: ChannelEntity })
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateChannelDto: UpdateChannelDto,
  ) {
    return this.channelsService.update(id, updateChannelDto);
  }

  @Delete(':id')
  @ApiOkResponse({ type: ChannelEntity })
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.channelsService.remove(id);
  }
}

