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
import { ListingsService } from './listings.service';
import { CreateListingDto } from './dto/create-listing.dto';
import { UpdateListingDto } from './dto/update-listing.dto';
import { ListingEntity } from './entities/listing.entity';
import { CurrentUser, CurrentUserData } from '../auth/decorators/current-user.decorator';

@Controller('listings')
@ApiTags('listings')
@ApiBearerAuth()
export class ListingsController {
  constructor(private readonly listingsService: ListingsService) {}

  @Post()
  @ApiCreatedResponse({ type: ListingEntity })
  create(
    @CurrentUser() user: CurrentUserData,
    @Body() createListingDto: CreateListingDto,
  ) {
    return this.listingsService.create(user.id, createListingDto);
  }

  @Get()
  @ApiOkResponse({ type: ListingEntity, isArray: true })
  findAll(@CurrentUser() user: CurrentUserData) {
    return this.listingsService.findAll(user.id);
  }

  @Get('active')
  @ApiOkResponse({ type: ListingEntity, isArray: true })
  findActive(@CurrentUser() user: CurrentUserData) {
    return this.listingsService.findActive(user.id);
  }

  @Get('my-listings')
  @ApiOkResponse({ type: ListingEntity, isArray: true })
  findMyListings(@CurrentUser() user: CurrentUserData) {
    return this.listingsService.findAll(user.id);
  }

  @Get(':id')
  @ApiOkResponse({ type: ListingEntity })
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.listingsService.findOne(id);
  }

  @Patch(':id')
  @ApiOkResponse({ type: ListingEntity })
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateListingDto: UpdateListingDto,
  ) {
    return this.listingsService.update(id, updateListingDto);
  }

  @Delete(':id')
  @ApiOkResponse({ type: ListingEntity })
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.listingsService.remove(id);
  }
}

