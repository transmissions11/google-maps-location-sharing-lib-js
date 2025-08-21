import { InvalidData } from './errors';

export class Person {
  private _id: string | null = null;
  private _pictureUrl: string | null = null;
  private _fullName: string | null = null;
  private _nickname: string | null = null;
  private _latitude: string | number | null = null;
  private _longitude: string | number | null = null;
  private _timestamp: number | string | null = null;
  private _accuracy: any = null;
  private _address: string | null = null;
  private _countryCode: string | null = null;
  private _charging: any = null;
  private _batteryLevel: any = null;

  constructor(data: any[]) {
    this.populate(data);
  }

  private populate(data: any[]) {
    try {
      this._id = data[6]?.[0] ?? null;
      this._pictureUrl = data[6]?.[1] ?? null;
      this._fullName = data[6]?.[2] ?? null;
      this._nickname = data[6]?.[3] ?? null;
      this._latitude = data[1]?.[1]?.[2] ?? null;
      this._longitude = data[1]?.[1]?.[1] ?? null;
      this._timestamp = data[1]?.[2] ?? null;
      this._accuracy = data[1]?.[3] ?? null;
      this._address = data[1]?.[4] ?? null;
      this._countryCode = data[1]?.[6] ?? null;
      this._charging = data[13]?.[0] ?? null;
      this._batteryLevel = data[13]?.[1] ?? null;
    } catch (e) {
      throw new InvalidData('Invalid person data array');
    }
  }

  toString(): string {
    const lines = [
      `Full name        :${this.fullName}`,
      `Nickname         :${this.nickname}`,
      `Current location :${this.address}`,
      `Latitude         :${this.latitude}`,
      `Longitude        :${this.longitude}`,
      `Datetime         :${this.datetime?.toISOString?.() ?? ''}`,
      `Charging         :${this.charging}`,
      `Battery %        :${this.batteryLevel}`,
      `Accuracy         :${this._accuracy}`,
    ];
    return lines.join('\n');
  }

  get id(): string | null {
    return this._id ?? this.fullName ?? null;
  }

  get pictureUrl(): string | null {
    return this._pictureUrl;
  }

  get fullName(): string | null {
    return this._fullName;
  }

  get nickname(): string | null {
    return this._nickname;
  }

  get latitude(): string | number | null {
    return this._latitude;
  }

  get longitude(): string | number | null {
    return this._longitude;
  }

  get timestamp(): number | string | null {
    return this._timestamp;
  }

  get datetime(): Date | null {
    if (this._timestamp == null) return null;
    const millis = Math.floor(Number(this._timestamp));
    if (!Number.isFinite(millis)) return null;
    // Python used UTC; JS Date is UTC by default for toISOString
    return new Date(millis);
  }

  get address(): string | null {
    return this._address;
  }

  get countryCode(): string | null {
    return this._countryCode;
  }

  get accuracy(): any {
    return this._accuracy;
  }

  get charging(): boolean {
    return Boolean(this._charging);
  }

  get batteryLevel(): any {
    return this._batteryLevel;
  }
}
