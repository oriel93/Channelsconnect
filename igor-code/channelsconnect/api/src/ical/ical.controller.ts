import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  ParseIntPipe,
  Query,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOkResponse,
  ApiCreatedResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { IcalService } from './ical.service';
import { CreateIcalConnectionDto, UpdateIcalConnectionDto, ImportIcalDto } from './dto/ical.dto';
import { CurrentUser, CurrentUserData } from '../auth/decorators/current-user.decorator';

@Controller('ical')
@ApiTags('ical')
@ApiBearerAuth()
export class IcalController {
  constructor(private readonly icalService: IcalService) {}

  @Post('connections')
  @ApiCreatedResponse()
  createConnection(
    @CurrentUser() user: CurrentUserData,
    @Body() createDto: CreateIcalConnectionDto,
  ) {
    return this.icalService.createConnection(user.id, createDto);
  }

  @Get('connections')
  @ApiOkResponse()
  findAllConnections(
    @CurrentUser() user: CurrentUserData,
    @Query('listingId') listingId?: string,
  ) {
    return this.icalService.findAll(user.id, listingId ? parseInt(listingId) : undefined);
  }

  @Get('connections/:id')
  @ApiOkResponse()
  findOneConnection(@Param('id', ParseIntPipe) id: number) {
    return this.icalService.findOne(id);
  }

  @Patch('connections/:id')
  @ApiOkResponse()
  updateConnection(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateDto: UpdateIcalConnectionDto,
  ) {
    return this.icalService.update(id, updateDto);
  }

  @Delete('connections/:id')
  @ApiOkResponse()
  removeConnection(@Param('id', ParseIntPipe) id: number) {
    return this.icalService.remove(id);
  }

  @Post('sync/:id')
  @ApiOkResponse()
  syncConnection(@Param('id', ParseIntPipe) id: number) {
    return this.icalService.syncConnection(id);
  }

  @Post('sync-all')
  @ApiOkResponse()
  syncAll(@CurrentUser() user: CurrentUserData) {
    return this.icalService.syncAll(user.id);
  }

  @Get('export/:listingId')
  @ApiOkResponse()
  exportIcal(@Param('listingId', ParseIntPipe) listingId: number) {
    return this.icalService.exportIcal(listingId);
  }

  @Post('import')
  @ApiCreatedResponse()
  importIcal(
    @CurrentUser() user: CurrentUserData,
    @Body() importDto: ImportIcalDto,
  ) {
    return this.icalService.importIcal(user.id, importDto.listingId, importDto.icalUrl);
  }
}

