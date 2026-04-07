import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateChannelDto } from './dto/create-channel.dto';
import { UpdateChannelDto } from './dto/update-channel.dto';

@Injectable()
export class ChannelsService {
  constructor(private prisma: PrismaService) {}

  async create(createChannelDto: CreateChannelDto) {
    return this.prisma.channel.create({
      data: createChannelDto,
    });
  }

  async findAll() {
    return this.prisma.channel.findMany({
      orderBy: { name: 'asc' },
    });
  }

  async findActive() {
    return this.prisma.channel.findMany({
      where: { isActive: true },
      orderBy: { name: 'asc' },
    });
  }

  async findOne(id: number) {
    return this.prisma.channel.findUnique({
      where: { id },
    });
  }

  async findBySlug(slug: string) {
    return this.prisma.channel.findUnique({
      where: { slug },
    });
  }

  async update(id: number, updateChannelDto: UpdateChannelDto) {
    return this.prisma.channel.update({
      where: { id },
      data: updateChannelDto,
    });
  }

  async remove(id: number) {
    return this.prisma.channel.delete({
      where: { id },
    });
  }
}

