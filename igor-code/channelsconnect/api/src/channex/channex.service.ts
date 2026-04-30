import { Injectable } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';


@Injectable()
export class ChannexService {
  private readonly baseUrl = 'https://staging.channex.io/api/v1';
  private readonly headers: any;

  constructor(private readonly httpService: HttpService) {
    const apiKey = process.env.CHANNEX_API_KEY || '';
    this.headers = {
      'user-api-key': apiKey,
      'Content-Type': 'application/json',
    };
  }

  async getProperties() {
    const res = await firstValueFrom(this.httpService.get(`${this.baseUrl}/properties`, { headers: this.headers }));
    return res.data;
  }
  async createProperty(data: any) {
    const res = await firstValueFrom(this.httpService.post(`${this.baseUrl}/properties`, { property: data }, { headers: this.headers }));
    return res.data;
  }
  async getRoomTypes(propertyId: string) {
    const res = await firstValueFrom(this.httpService.get(`${this.baseUrl}/room_types?filter[property_id]=${propertyId}`, { headers: this.headers }));
    return res.data;
  }
  async createRoomType(data: any) {
    const res = await firstValueFrom(this.httpService.post(`${this.baseUrl}/room_types`, { room_type: data }, { headers: this.headers }));
    return res.data;
  }
  async getRatePlans(propertyId: string) {
    const res = await firstValueFrom(this.httpService.get(`${this.baseUrl}/rate_plans?filter[property_id]=${propertyId}`, { headers: this.headers }));
    return res.data;
  }
  async createRatePlan(data: any) {
    const res = await firstValueFrom(this.httpService.post(`${this.baseUrl}/rate_plans`, { rate_plan: data }, { headers: this.headers }));
    return res.data;
  }

  // --- NEW: CHANNEL & IMPORT LOGIC ---
  async createChannel(data: any) {
    const res = await firstValueFrom(this.httpService.post(`${this.baseUrl}/channels`, { channel: data }, { headers: this.headers }));
    return res.data;
  }
  async importProperties(channelId: string) {
    const res = await firstValueFrom(this.httpService.post(`${this.baseUrl}/imports`, { import: { channel_id: channelId } }, { headers: this.headers }));
    return res.data;
  }
}
